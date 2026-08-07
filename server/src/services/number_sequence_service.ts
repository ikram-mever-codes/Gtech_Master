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

async function findLastUsedNumber(
  manager: any,
  sequenceKey: string,
  testSeq: any,
  nextRunningNo: number,
): Promise<string | null> {
  const dummyPattern = (testSeq.formatPattern || "").replace("{number}", "___NUMBER___");
  const dummySeq = { ...testSeq, formatPattern: dummyPattern };
  const dummyFormatted = NumberSequenceService.formatNumber(dummySeq, 1);
  const numberMarkerIdx = dummyFormatted.indexOf("___NUMBER___");
  const prefixPart = numberMarkerIdx > -1 ? dummyFormatted.substring(0, numberMarkerIdx) : "";

  let candidateRecords: string[] = [];

  const addFromRepo = async (repo: any, col: string) => {
    try {
      let qb = repo.createQueryBuilder("e").select(`e.${col}`, "val");
      if (prefixPart) {
        qb = qb.where(`e.${col} LIKE :p`, { p: `${prefixPart}%` });
      }
      const rows = await qb.getRawMany();
      rows.forEach((r: any) => {
        if (r && r.val) candidateRecords.push(String(r.val).trim());
      });
    } catch (err) {
    }
  };

  if (sequenceKey === "invoice") {
    await addFromRepo(manager.getRepository(Rechnung), "invoice_number");
    await addFromRepo(manager.getRepository(CCIInvoice), "invoice_number");
    await addFromRepo(manager.getRepository(Invoice), "invoiceNumber");
  } else if (sequenceKey === "invoice_correction") {
    await addFromRepo(manager.getRepository(RechnungK), "invoice_number");
    await addFromRepo(manager.getRepository(Invoice), "invoiceNumber");
  } else if (sequenceKey === "delivery_note") {
    await addFromRepo(manager.getRepository(Lieferschein), "delivery_note_number");
    await addFromRepo(manager.getRepository(CCIInvoice), "cargo_no");
    await addFromRepo(manager.getRepository(Invoice), "invoiceNumber");
  } else if (sequenceKey === "order" || sequenceKey === "customer_order") {
    await addFromRepo(manager.getRepository(CustomerOrder), "order_no");
    await addFromRepo(manager.getRepository(Order), "order_no");
  } else {
    const mapping = entityMapping[sequenceKey];
    if (mapping) {
      await addFromRepo(manager.getRepository(mapping.entity), mapping.column);
    }
  }

  if (candidateRecords.length > 0) {
    let maxNum = -1;
    let maxStr = "";

    candidateRecords.forEach((str) => {
      const numPart = prefixPart && str.startsWith(prefixPart)
        ? str.substring(prefixPart.length)
        : str;
      const match = numPart.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) {
          maxNum = num;
          maxStr = str;
        }
      }
    });

    if (maxStr) return maxStr;
  }

  for (let num = nextRunningNo; num >= 1; num--) {
    const f = NumberSequenceService.formatNumber(testSeq, num);
    const dup = await checkIsDuplicate(manager, sequenceKey, f);
    if (dup) return f;
  }

  return null;
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

  public static formatNumber(
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

    try {
      await repo.delete({ sequenceKey: "order" });
      await repo.update(
        { sequenceKey: "customer_order" },
        { name: "Auftrag" },
      );
    } catch (err) {
      console.warn("[NumberSequence] Migration warning:", err);
    }

    const defaults = [
      { sequenceKey: "offer", name: "Angebot", prefix: "A", formatPattern: "{prefix}{yy}{mm}-{number}", minDigits: 1 },
      { sequenceKey: "customer_order", name: "Auftrag", prefix: "B", formatPattern: "{prefix}{yy}{mm}-{number}", minDigits: 1 },
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
      } else if (exists.name !== def.name) {
        exists.name = def.name;
        await repo.save(exists);
      }
    }
  }

  static async checkIfNumberExists(
    sequenceKey: string,
    nextRunningNo: number,
    prefix?: string,
    formatPattern?: string,
    minDigits?: number,
  ): Promise<{ isDuplicate: boolean; formattedNumber: string; lastUsedNumber?: string }> {
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

    let lastUsedNumber: string | undefined = undefined;
    if (isDuplicate) {
      const foundLast = await findLastUsedNumber(manager, sequenceKey, testSeq, nextRunningNo);
      if (foundLast) {
        lastUsedNumber = foundLast;
      }
    }

    return {
      isDuplicate,
      formattedNumber,
      lastUsedNumber,
    };
  }
}