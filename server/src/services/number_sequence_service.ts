import { AppDataSource } from "../config/database";
import { NumberSequence } from "../models/number_sequence";
import { Customer } from "../models/customers";
import { Cargo } from "../models/cargos";
import { Invoice } from "../models/invoice";
import { Offer } from "../models/offer";
import { Order } from "../models/orders";
import { Inquiry } from "../models/inquiry";
import { Rechnung } from "../models/rechnung";
import { Rechnung_k as RechnungK } from "../models/rechnung_k";
import { Lieferschein } from "../models/lieferscheine";
import { CCIInvoice } from "../models/cci_invoice";
import { CustomerOrder } from "../models/customer_orders";

const entityMapping: Record<string, { entity: any; column: string }> = {
  customer: { entity: Customer, column: "customerNumber" },
  cargo: { entity: Cargo, column: "cargo_no" },
  closed_ci: { entity: Invoice, column: "invoiceNumber" },
  offer: { entity: Offer, column: "offerNumber" },
  order: { entity: Order, column: "order_no" },
  customer_order: { entity: CustomerOrder, column: "order_no" },
  transfer_order: { entity: Order, column: "order_no" },
  invoice: { entity: Rechnung, column: "invoice_number" },
  invoice_correction: { entity: RechnungK, column: "invoice_number" },
  delivery_note: { entity: Lieferschein, column: "delivery_note_number" },
  inquiry: { entity: Inquiry, column: "inquiryNo" },
};

async function checkIsDuplicate(manager: any, sequenceKey: string, formattedVal: string): Promise<boolean> {
  if (sequenceKey === "invoice") {
    const [r, c, i] = await Promise.all([
      manager.getRepository(Rechnung).findOne({ where: { invoice_number: formattedVal } }),
      manager.getRepository(CCIInvoice).findOne({ where: { invoice_number: formattedVal } }),
      manager.getRepository(Invoice).findOne({ where: { invoiceNumber: formattedVal } }),
    ]);
    return !!(r || c || i);
  }

  if (sequenceKey === "invoice_correction") {
    const [rk, i] = await Promise.all([
      manager.getRepository(RechnungK).findOne({ where: { invoice_number: formattedVal } }),
      manager.getRepository(Invoice).findOne({ where: { invoiceNumber: formattedVal } }),
    ]);
    return !!(rk || i);
  }

  if (sequenceKey === "delivery_note") {
    const [ls, c, i] = await Promise.all([
      manager.getRepository(Lieferschein).findOne({ where: { delivery_note_number: formattedVal } }),
      manager.getRepository(CCIInvoice).findOne({ where: { cargo_no: formattedVal } }),
      manager.getRepository(Invoice).findOne({ where: { invoiceNumber: formattedVal } }),
    ]);
    return !!(ls || c || i);
  }

  if (sequenceKey === "order" || sequenceKey === "customer_order") {
    const [co, o] = await Promise.all([
      manager.getRepository(CustomerOrder).findOne({ where: { order_no: formattedVal } }),
      manager.getRepository(Order).findOne({ where: { order_no: formattedVal } }),
    ]);
    return !!(co || o);
  }

  const mapping = entityMapping[sequenceKey];
  if (!mapping) return false;

  const existing = await manager.getRepository(mapping.entity)
    .createQueryBuilder("entity")
    .where(`entity.${mapping.column} = :val`, { val: formattedVal })
    .getOne();

  return !!existing;
}

export class NumberSequenceService {
  static async getNextNumber(sequenceKey: string): Promise<string> {
    return AppDataSource.transaction(async (manager) => {
      const sequence = await manager
        .createQueryBuilder(NumberSequence, "seq")
        .setLock("pessimistic_write")
        .where("seq.sequenceKey = :sequenceKey", { sequenceKey })
        .getOne();

      if (!sequence) {
        throw new Error(`Number sequence "${sequenceKey}" not found`);
      }
      if (!sequence.isActive) {
        throw new Error(`Number sequence "${sequenceKey}" is not active`);
      }

      let runningNo = sequence.nextRunningNo || 1;

      let generatedNumber = "";
      let isDuplicate = true;

      while (isDuplicate) {
        generatedNumber = this.formatNumber(sequence, runningNo);
        const dup = await checkIsDuplicate(manager, sequenceKey, generatedNumber);
        if (dup) {
          runningNo++;
        } else {
          isDuplicate = false;
        }
      }

      sequence.nextRunningNo = runningNo + 1;
      await manager.save(sequence);

      return generatedNumber;
    });
  }

  private static formatNumber(
    sequence: NumberSequence,
    runningNo: number,
  ): string {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const yy = yyyy.slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const number = String(runningNo).padStart(sequence.minDigits || 1, "0");

    return sequence.formatPattern
      .replace("{prefix}", sequence.prefix || "")
      .replace("{yyyy}", yyyy)
      .replace("{yy}", yy)
      .replace("{mm}", mm)
      .replace("{number}", number);
  }

  static async seedDefaultSequences(): Promise<void> {
    const repo = AppDataSource.getRepository(NumberSequence);
    const defaults = [
      { sequenceKey: "offer", name: "Angebot", prefix: "A", formatPattern: "{prefix}{yy}{mm}-{number}", minDigits: 1 },
      { sequenceKey: "order", name: "Auftrag", prefix: "B", formatPattern: "{prefix}{yy}{mm}-{number}", minDigits: 1 },
      { sequenceKey: "customer_order", name: "Customer Order (Auftrag)", prefix: "B", formatPattern: "{prefix}{yy}{mm}-{number}", minDigits: 1 },
      { sequenceKey: "transfer_order", name: "Bestellung", prefix: "DE", formatPattern: "{prefix}{yy}{mm}-{number}", minDigits: 1 },
      { sequenceKey: "invoice", name: "Rechnung", prefix: "R", formatPattern: "{prefix}{yy}{mm}-{number}", minDigits: 1 },
      { sequenceKey: "invoice_correction", name: "Rechnungskorrektur", prefix: "RK", formatPattern: "{prefix}{yy}{mm}-{number}", minDigits: 1 },
      { sequenceKey: "delivery_note", name: "Lieferschein", prefix: "L", formatPattern: "{prefix}{yy}{mm}-{number}", minDigits: 1 },
      { sequenceKey: "customer", name: "Kunde", prefix: "K", formatPattern: "{prefix}{number}", minDigits: 1 },
      { sequenceKey: "cargo", name: "Cargo", prefix: "C", formatPattern: "{prefix}{yy}{mm}-{number}", minDigits: 1 },
      { sequenceKey: "closed_ci", name: "Commercial Invoice", prefix: "CI", formatPattern: "{prefix}{yy}{mm}-{number}", minDigits: 1 },
      { sequenceKey: "inquiry", name: "Anfrage", prefix: "AF", formatPattern: "{prefix}{yy}{mm}-{number}", minDigits: 1 },
    ];

    for (const def of defaults) {
      const exists = await repo.findOne({
        where: { sequenceKey: def.sequenceKey },
      });
      if (!exists) {
        const startNo = def.sequenceKey === "customer" ? 83777 : 1;
        await repo.save(
          repo.create({ ...def, nextRunningNo: startNo }),
        );
      }
    }
  }

  static async checkIfNumberExists(
    sequenceKey: string,
    nextRunningNo: number,
    prefix?: string,
    formatPattern?: string,
    minDigits?: number,
  ): Promise<{ isDuplicate: boolean; formattedNumber: string }> {
    const sequenceRepo = AppDataSource.getRepository(NumberSequence);
    const sequence = await sequenceRepo.findOne({ where: { sequenceKey } });
    if (!sequence) return { isDuplicate: false, formattedNumber: "" };

    const testSeq = {
      ...sequence,
      prefix: prefix ?? sequence.prefix,
      formatPattern: formatPattern ?? sequence.formatPattern,
      minDigits: minDigits ?? sequence.minDigits,
    };

    const formattedNumber = this.formatNumber(testSeq, nextRunningNo);
    const manager = AppDataSource.manager;
    const isDuplicate = await checkIsDuplicate(manager, sequenceKey, formattedNumber);

    return {
      isDuplicate,
      formattedNumber,
    };
  }
}
