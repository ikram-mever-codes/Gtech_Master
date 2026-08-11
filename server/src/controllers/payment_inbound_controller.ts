import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { PaymentInbound } from "../models/payment_inbound";
import { PaymentAccount } from "../models/payment_account";
import ErrorHandler from "../utils/errorHandler";
import { attachAllocationSummaryToInbounds } from "./payment_allocations_controller";

export const getAllPaymentInbounds = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const repository = AppDataSource.getRepository(PaymentInbound);
    const inbounds = await repository.find({
      relations: ["paymentAccount"],
      order: {
        received_date: "DESC",
        created_at: "DESC",
      },
    });

    // Every row also gets allocated_amount / open_amount so the frontend
    // can decide whether to show the "Assign" action without a second
    // round trip per row.
    await attachAllocationSummaryToInbounds(inbounds);

    return res.status(200).json({
      success: true,
      data: inbounds,
    });
  } catch (error) {
    console.error("Error fetching payment inbounds:", error);
    return next(new ErrorHandler("Failed to retrieve payment inbounds", 500));
  }
};

export const getPaymentInboundById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const repository = AppDataSource.getRepository(PaymentInbound);
    const { id } = req.params;

    const inbound = await repository.findOne({
      where: { id },
      relations: ["paymentAccount"],
    });

    if (!inbound) {
      return res.status(404).json({
        success: false,
        message: "Payment Inbound entry not found.",
      });
    }

    await attachAllocationSummaryToInbounds([inbound]);

    return res.status(200).json({
      success: true,
      data: inbound,
    });
  } catch (error) {
    console.error("Error fetching payment inbound by ID:", error);
    return next(
      new ErrorHandler("Failed to retrieve payment inbound details", 500),
    );
  }
};

export const createPaymentInbound = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const repository = AppDataSource.getRepository(PaymentInbound);
    const accountRepo = AppDataSource.getRepository(PaymentAccount);

    const {
      payment_account_id,
      paymentAccountId,
      external_transaction_id,
      externalTransactionId,
      received_date,
      receivedDate,
      amount,
      currency_code,
      currencyCode,
      payer_name,
      payerName,
      payer_account_reference,
      payerAccountReference,
      reference,
      source,
    } = req.body;

    const targetAccountId = payment_account_id || paymentAccountId || null;
    let paymentAccountObj: PaymentAccount | null = null;

    if (targetAccountId) {
      paymentAccountObj = await accountRepo.findOne({
        where: { id: targetAccountId },
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount > 0 is required.",
      });
    }

    const rDate =
      received_date || receivedDate
        ? new Date(received_date || receivedDate)
        : new Date();

    const currentUser = (req as any).user;
    const createdByUserId = currentUser?.id
      ? String(currentUser.id)
      : undefined;

    const inbound = repository.create({
      payment_account_id: targetAccountId || undefined,
      paymentAccount: paymentAccountObj,
      external_transaction_id:
        (external_transaction_id || externalTransactionId || "").trim() ||
        undefined,
      received_date: rDate,
      amount: numAmount,
      currency_code: (currency_code || currencyCode || "EUR")
        .trim()
        .toUpperCase(),
      payer_name: (payer_name || payerName || "").trim() || undefined,
      payer_account_reference:
        (payer_account_reference || payerAccountReference || "").trim() ||
        undefined,
      reference: (reference || "").trim() || undefined,
      created_by_user_id: createdByUserId,
      source: (source || "manual").trim(),
    });

    const saved = await repository.save(inbound);

    const fullSaved: any = await repository.findOne({
      where: { id: saved.id },
      relations: ["paymentAccount"],
    });
    // Freshly created — nothing assigned to it yet.
    if (fullSaved) {
      fullSaved.allocated_amount = 0;
      fullSaved.open_amount = Number(fullSaved.amount) || 0;
    }

    return res.status(201).json({
      success: true,
      data: fullSaved,
      message: "Payment Inbound entry created successfully.",
    });
  } catch (error) {
    console.error("Error creating payment inbound:", error);
    return next(
      new ErrorHandler("Failed to create payment inbound entry", 500),
    );
  }
};

export const updatePaymentInbound = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const repository = AppDataSource.getRepository(PaymentInbound);
    const accountRepo = AppDataSource.getRepository(PaymentAccount);
    const { id } = req.params;

    const inbound = await repository.findOne({
      where: { id },
      relations: ["paymentAccount"],
    });

    if (!inbound) {
      return res.status(404).json({
        success: false,
        message: "Payment Inbound entry not found.",
      });
    }

    const {
      payment_account_id,
      paymentAccountId,
      external_transaction_id,
      externalTransactionId,
      received_date,
      receivedDate,
      amount,
      currency_code,
      currencyCode,
      payer_name,
      payerName,
      payer_account_reference,
      payerAccountReference,
      reference,
      source,
    } = req.body;

    const targetAccountId = payment_account_id ?? paymentAccountId;
    if (targetAccountId !== undefined) {
      if (targetAccountId) {
        const acc = await accountRepo.findOne({
          where: { id: targetAccountId },
        });
        inbound.payment_account_id = targetAccountId;
        inbound.paymentAccount = acc;
      } else {
        inbound.payment_account_id = undefined;
        inbound.paymentAccount = null;
      }
    }

    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (!isNaN(numAmount) && numAmount > 0) {
        inbound.amount = numAmount;
      }
    }

    if (received_date !== undefined || receivedDate !== undefined) {
      inbound.received_date = new Date(received_date || receivedDate);
    }

    if (currency_code !== undefined || currencyCode !== undefined) {
      inbound.currency_code = (currency_code || currencyCode || "EUR")
        .trim()
        .toUpperCase();
    }

    if (payer_name !== undefined || payerName !== undefined) {
      inbound.payer_name = (payer_name || payerName || "").trim() || undefined;
    }

    if (
      payer_account_reference !== undefined ||
      payerAccountReference !== undefined
    ) {
      inbound.payer_account_reference =
        (payer_account_reference || payerAccountReference || "").trim() ||
        undefined;
    }

    if (
      external_transaction_id !== undefined ||
      externalTransactionId !== undefined
    ) {
      inbound.external_transaction_id =
        (external_transaction_id || externalTransactionId || "").trim() ||
        undefined;
    }

    if (reference !== undefined) {
      inbound.reference = (reference || "").trim() || undefined;
    }

    if (source !== undefined) {
      inbound.source = (source || "manual").trim();
    }

    const updated = await repository.save(inbound);

    const fullUpdated = await repository.findOne({
      where: { id: updated.id },
      relations: ["paymentAccount"],
    });
    if (fullUpdated) {
      await attachAllocationSummaryToInbounds([fullUpdated]);
    }

    return res.status(200).json({
      success: true,
      data: fullUpdated,
      message: "Payment Inbound entry updated successfully.",
    });
  } catch (error) {
    console.error("Error updating payment inbound:", error);
    return next(
      new ErrorHandler("Failed to update payment inbound entry", 500),
    );
  }
};

export const deletePaymentInbound = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const repository = AppDataSource.getRepository(PaymentInbound);
    const { id } = req.params;

    const inbound = await repository.findOne({
      where: { id },
    });

    if (!inbound) {
      return res.status(404).json({
        success: false,
        message: "Payment Inbound entry not found.",
      });
    }

    // Allocations reference this inbound with onDelete: "CASCADE" at the
    // DB level, so removing the inbound also removes any assignments
    // made against it — deleting a payment record should not leave
    // orphaned "paid via ghost payment" links on an Auftrag/Rechnung.
    await repository.remove(inbound);

    return res.status(200).json({
      success: true,
      message: "Payment Inbound entry deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting payment inbound:", error);
    return next(
      new ErrorHandler("Failed to delete payment inbound entry", 500),
    );
  }
};
