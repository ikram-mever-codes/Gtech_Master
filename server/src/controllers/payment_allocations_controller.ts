import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { PaymentInbound } from "../models/payment_inbound";
import {
  PaymentAllocation,
  PaymentAllocationTargetType,
} from "../models/payment_allocations";
import { CustomerOrder } from "../models/customer_orders";
import { Rechnung } from "../models/rechnung";
import { Rechnung_k } from "../models/rechnung_k";

const round2 = (n: number): number =>
  isNaN(n) || !isFinite(n) ? 0 : Math.round(n * 100) / 100;

/** Sum of everything already allocated out of one Payment Inbound. */
export async function getAllocatedAmountForInbound(
  inboundId: string,
): Promise<number> {
  const repo = AppDataSource.getRepository(PaymentAllocation);
  const raw = await repo
    .createQueryBuilder("pa")
    .select("COALESCE(SUM(pa.amount), 0)", "sum")
    .where("pa.payment_inbound_id = :inboundId", { inboundId })
    .getRawOne();
  return round2(Number(raw?.sum) || 0);
}

/**
 * Attaches allocated_amount / open_amount to a list of PaymentInbound
 * rows in one batched query, so list/detail endpoints don't need to
 * query per-row. Mutates the rows in place (same pattern as
 * attachStockInfoToOrders in the customer_orders controller).
 */
export async function attachAllocationSummaryToInbounds(
  inbounds: PaymentInbound[],
): Promise<void> {
  if (inbounds.length === 0) return;

  const repo = AppDataSource.getRepository(PaymentAllocation);
  const ids = inbounds.map((i) => i.id);
  const rows = await repo
    .createQueryBuilder("pa")
    .select("pa.payment_inbound_id", "id")
    .addSelect("COALESCE(SUM(pa.amount), 0)", "sum")
    .where("pa.payment_inbound_id IN (:...ids)", { ids })
    .groupBy("pa.payment_inbound_id")
    .getRawMany();

  const sumById = new Map<string, number>(
    rows.map((r: any) => [r.id, round2(Number(r.sum) || 0)]),
  );

  for (const inbound of inbounds as any[]) {
    const allocated = sumById.get(inbound.id) || 0;
    inbound.allocated_amount = allocated;
    inbound.open_amount = round2(Number(inbound.amount || 0) - allocated);
  }
}

/**
 * Assign part (or all) of a Payment Inbound to an Auftrag or Rechnung.
 * This is its own flat resource (POST /payment-allocations), so the
 * Payment Inbound being assigned is identified in the body rather than
 * the URL.
 * Body: { paymentInboundId, targetType: "auftrag" | "rechnung", targetId, amount, notes? }
 */
export const createPaymentAllocation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      paymentInboundId,
      payment_inbound_id,
      targetType,
      target_type,
      targetId,
      target_id,
      amount,
      notes,
    } = req.body;

    const finalInboundId = paymentInboundId || payment_inbound_id;
    if (!finalInboundId) {
      res
        .status(400)
        .json({ success: false, message: "paymentInboundId is required" });
      return;
    }

    const finalTargetType = String(
      targetType || target_type || "",
    ).toLowerCase();
    const finalTargetId = targetId ?? target_id;

    if (
      finalTargetType !== PaymentAllocationTargetType.AUFTRAG &&
      finalTargetType !== PaymentAllocationTargetType.RECHNUNG
    ) {
      res.status(400).json({
        success: false,
        message: "targetType must be 'auftrag' or 'rechnung'",
      });
      return;
    }
    if (
      finalTargetId === undefined ||
      finalTargetId === null ||
      finalTargetId === ""
    ) {
      res.status(400).json({ success: false, message: "targetId is required" });
      return;
    }

    const requestedAmount = round2(Number(amount));
    if (!requestedAmount || requestedAmount <= 0) {
      res.status(400).json({
        success: false,
        message: "amount must be greater than 0",
      });
      return;
    }

    const inboundRepo = AppDataSource.getRepository(PaymentInbound);
    const inbound = await inboundRepo.findOne({
      where: { id: finalInboundId },
    });
    if (!inbound) {
      res
        .status(404)
        .json({ success: false, message: "Payment Inbound not found" });
      return;
    }

    const alreadyAllocated = await getAllocatedAmountForInbound(inbound.id);
    const openAmount = round2(Number(inbound.amount) - alreadyAllocated);
    // Small epsilon to absorb decimal rounding noise.
    if (requestedAmount > openAmount + 0.005) {
      res.status(400).json({
        success: false,
        message: `Only ${openAmount.toFixed(2)} ${inbound.currency_code} is still open on this payment.`,
      });
      return;
    }

    let targetLabel = "";
    if (finalTargetType === PaymentAllocationTargetType.AUFTRAG) {
      const orderRepo = AppDataSource.getRepository(CustomerOrder);
      const order = await orderRepo.findOne({
        where: { id: Number(finalTargetId) },
      });
      if (!order) {
        res.status(404).json({ success: false, message: "Auftrag not found" });
        return;
      }
      targetLabel = order.order_no;
    } else {
      const rechnungRepo = AppDataSource.getRepository(Rechnung);
      const rechnung = await rechnungRepo.findOne({
        where: { id: String(finalTargetId) },
      });
      if (!rechnung) {
        res.status(404).json({ success: false, message: "Rechnung not found" });
        return;
      }
      targetLabel = rechnung.invoice_number;
    }

    const allocationRepo = AppDataSource.getRepository(PaymentAllocation);
    const currentUser = (req as any).user;
    const allocation = allocationRepo.create({
      payment_inbound_id: inbound.id,
      target_type: finalTargetType as PaymentAllocationTargetType,
      auftrag_id:
        finalTargetType === PaymentAllocationTargetType.AUFTRAG
          ? Number(finalTargetId)
          : undefined,
      rechnung_id:
        finalTargetType === PaymentAllocationTargetType.RECHNUNG
          ? String(finalTargetId)
          : undefined,
      target_label: targetLabel,
      amount: requestedAmount,
      notes: notes || undefined,
      created_by_user_id: currentUser?.id ? String(currentUser.id) : undefined,
    });
    const saved = await allocationRepo.save(allocation);

    const newAllocatedTotal = round2(alreadyAllocated + requestedAmount);
    const fullInbound: any = await inboundRepo.findOne({
      where: { id: inbound.id },
      relations: ["paymentAccount"],
    });
    if (fullInbound) {
      fullInbound.allocated_amount = newAllocatedTotal;
      fullInbound.open_amount = round2(
        Number(inbound.amount) - newAllocatedTotal,
      );
    }

    res.status(201).json({
      success: true,
      message: `Assigned ${requestedAmount.toFixed(2)} ${inbound.currency_code} to ${targetLabel}`,
      data: { allocation: saved, paymentInbound: fullInbound },
    });
  } catch (error) {
    next(error);
  }
};

/** Undo an assignment — the amount becomes open on the Payment Inbound again. */
export const deletePaymentAllocation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { allocationId } = req.params;
    const allocationRepo = AppDataSource.getRepository(PaymentAllocation);
    const allocation = await allocationRepo.findOne({
      where: { id: allocationId },
    });
    if (!allocation) {
      res.status(404).json({ success: false, message: "Allocation not found" });
      return;
    }
    await allocationRepo.remove(allocation);
    res.json({ success: true, message: "Allocation removed" });
  } catch (error) {
    next(error);
  }
};

/** All allocations for one Payment Inbound, plus its allocated/open summary. */
export const getAllocationsForPaymentInbound = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { paymentInboundId } = req.params;
    const inboundRepo = AppDataSource.getRepository(PaymentInbound);
    const inbound = await inboundRepo.findOne({
      where: { id: paymentInboundId },
    });
    if (!inbound) {
      res
        .status(404)
        .json({ success: false, message: "Payment Inbound not found" });
      return;
    }

    const allocationRepo = AppDataSource.getRepository(PaymentAllocation);
    const allocations = await allocationRepo.find({
      where: { payment_inbound_id: paymentInboundId },
      order: { created_at: "DESC" },
    });
    const allocated = round2(
      allocations.reduce((sum, a) => sum + Number(a.amount), 0),
    );

    res.json({
      success: true,
      data: {
        allocations,
        amount: Number(inbound.amount),
        currency_code: inbound.currency_code,
        allocated_amount: allocated,
        open_amount: round2(Number(inbound.amount) - allocated),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * All allocations covering one Auftrag or Rechnung — lets a document's
 * own preview show "paid via: <payments>" if that's wired in later.
 */
export const getAllocationsForTarget = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { targetType, targetId } = req.params;
    const normalizedType = String(targetType || "").toLowerCase();
    if (
      normalizedType !== PaymentAllocationTargetType.AUFTRAG &&
      normalizedType !== PaymentAllocationTargetType.RECHNUNG
    ) {
      res.status(400).json({
        success: false,
        message: "targetType must be 'auftrag' or 'rechnung'",
      });
      return;
    }

    const allocationRepo = AppDataSource.getRepository(PaymentAllocation);
    const qb = allocationRepo
      .createQueryBuilder("pa")
      .leftJoinAndSelect("pa.paymentInbound", "paymentInbound")
      .where("pa.target_type = :normalizedType", { normalizedType })
      .orderBy("pa.created_at", "DESC");

    if (normalizedType === PaymentAllocationTargetType.AUFTRAG) {
      qb.andWhere("pa.auftrag_id = :targetId", { targetId: Number(targetId) });
    } else {
      qb.andWhere("pa.rechnung_id = :targetId", { targetId: String(targetId) });
    }

    const allocations = await qb.getMany();
    const paidAmount = round2(
      allocations.reduce((sum, a) => sum + Number(a.amount), 0),
    );

    res.json({ success: true, data: { allocations, paid_amount: paidAmount } });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// Rechnung payment status — derived, never stored. Computed fresh
// from PaymentAllocation sums + due-date logic every time a Rechnung
// is read, so it can't go stale the way a persisted field could.
// ============================================================

export type RechnungPaymentStatus =
  | "paid"
  | "partially_paid"
  | "unpaid"
  | "overdue";

/**
 * The date payment is considered due: the Rechnung's own due_date if
 * set, otherwise invoice_date (falling back to delivery_date) plus
 * payment_terms days (or 30 days if payment_terms isn't a usable
 * number) — the same default window used elsewhere in this codebase
 * (see the CCI invoice due_date fallback in createRechnungFromAuftrag).
 */
function getEffectiveDueDate(rechnung: {
  due_date?: any;
  invoice_date?: any;
  delivery_date?: any;
  payment_terms?: any;
}): Date | null {
  if (rechnung.due_date) {
    const d = new Date(rechnung.due_date);
    if (!isNaN(d.getTime())) return d;
  }

  const baseRaw = rechnung.invoice_date || rechnung.delivery_date;
  if (!baseRaw) return null;
  const base = new Date(baseRaw);
  if (isNaN(base.getTime())) return null;

  const parsedTerms = parseInt(String(rechnung.payment_terms), 10);
  const termDays = !isNaN(parsedTerms) && parsedTerms > 0 ? parsedTerms : 30;

  const due = new Date(base);
  due.setDate(due.getDate() + termDays);
  return due;
}

/**
 * paid: fully covered by allocations.
 * overdue: not fully paid AND the effective due date has passed —
 *   checked before partially_paid/unpaid so a late partial payment
 *   still shows as overdue rather than hiding behind "partially paid".
 * partially_paid: some but not all of the total has been allocated,
 *   due date not yet passed.
 * unpaid: nothing allocated yet, due date not yet passed.
 */
export function computeRechnungPaymentStatus(
  rechnung: {
    due_date?: any;
    invoice_date?: any;
    delivery_date?: any;
    payment_terms?: any;
    total_amount?: any;
  },
  paidAmount: number,
  correctedAmount: number = 0,
): RechnungPaymentStatus {
  const total = Number(rechnung.total_amount) || 0;
  const covered = round2(paidAmount + correctedAmount);

  if (total > 0 && covered >= total - 0.01) return "paid";

  const dueDate = getEffectiveDueDate(rechnung);
  if (dueDate && dueDate.getTime() < Date.now()) return "overdue";

  return covered > 0.005 ? "partially_paid" : "unpaid";
}

export async function attachPaymentStatusToRechnungen(
  rechnungen: Rechnung[],
): Promise<void> {
  if (rechnungen.length === 0) return;

  const ids = rechnungen.map((r) => r.id);

  const paymentRepo = AppDataSource.getRepository(PaymentAllocation);
  const paymentRows = await paymentRepo
    .createQueryBuilder("pa")
    .select("pa.rechnung_id", "id")
    .addSelect("COALESCE(SUM(pa.amount), 0)", "sum")
    .where("pa.target_type = :targetType", {
      targetType: PaymentAllocationTargetType.RECHNUNG,
    })
    .andWhere("pa.rechnung_id IN (:...ids)", { ids })
    .groupBy("pa.rechnung_id")
    .getRawMany();

  const paidById = new Map<string, number>(
    paymentRows.map((r: any) => [r.id, round2(Number(r.sum) || 0)]),
  );

  const rkRepo = AppDataSource.getRepository(Rechnung_k);
  const rkRows = await rkRepo
    .createQueryBuilder("rk")
    .select("rk.original_rechnung_id", "id")
    .addSelect("COALESCE(SUM(rk.total_amount), 0)", "sum")
    .where("rk.original_rechnung_id IN (:...ids)", { ids })
    .groupBy("rk.original_rechnung_id")
    .getRawMany();

  const correctedById = new Map<string, number>(
    rkRows.map((r: any) => [r.id, round2(Number(r.sum) || 0)]),
  );

  for (const rechnung of rechnungen as any[]) {
    const paid = paidById.get(rechnung.id) || 0;
    const corrected = correctedById.get(rechnung.id) || 0;
    rechnung.paid_amount = paid;
    rechnung.corrected_amount = corrected;
    rechnung.open_amount = round2(
      Number(rechnung.total_amount || 0) - paid - corrected,
    );
    rechnung.payment_status = computeRechnungPaymentStatus(
      rechnung,
      paid,
      corrected,
    );
  }
}
