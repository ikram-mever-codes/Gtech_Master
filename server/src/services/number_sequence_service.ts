import { AppDataSource } from "../config/database";
import { NumberSequence } from "../models/number_sequence";
import { Customer } from "../models/customers";
import { Cargo } from "../models/cargos";
import { Invoice } from "../models/invoice";
import { Offer } from "../models/offer";
import { Order } from "../models/orders";

const entityMapping: Record<string, { entity: any; column: string }> = {
  customer: { entity: Customer, column: "customerNumber" },
  cargo: { entity: Cargo, column: "cargo_no" },
  closed_ci: { entity: Invoice, column: "invoiceNumber" },
  offer: { entity: Offer, column: "offerNumber" },
  order: { entity: Order, column: "order_no" },
  transfer_order: { entity: Order, column: "order_no" },
  invoice: { entity: Invoice, column: "invoiceNumber" },
  invoice_correction: { entity: Invoice, column: "invoiceNumber" },
  delivery_note: { entity: Invoice, column: "invoiceNumber" },
};

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

      let runningNo = sequence.nextRunningNo;
      const mapping = entityMapping[sequenceKey];

      if (mapping) {
        const maxRecord = await manager.getRepository(mapping.entity)
          .createQueryBuilder("entity")
          .orderBy(`entity.${mapping.column}`, "DESC")
          .getOne();

        const defaultStart = sequenceKey === "customer" ? 83777 : 1;

        if (!maxRecord) {
          runningNo = defaultStart;
        } else {
          const maxVal = maxRecord[mapping.column];
          const match = String(maxVal).match(/\d+$/);
          if (match) {
            let maxNum = parseInt(match[0], 10);

            if (sequenceKey === "closed_ci" && match[0].length > sequence.minDigits) {
              const suffix = match[0].slice(-sequence.minDigits);
              maxNum = parseInt(suffix, 10);
            }

            const nextAligned = maxNum + 1;
            if (runningNo > nextAligned) {
              runningNo = Math.max(defaultStart, nextAligned);
            }
          }
        }
      }

      let generatedNumber = "";
      let isDuplicate = true;

      while (isDuplicate) {
        generatedNumber = this.formatNumber(sequence, runningNo);

        if (mapping) {
          const existing = await manager.getRepository(mapping.entity)
            .createQueryBuilder("entity")
            .where(`entity.${mapping.column} = :val`, { val: generatedNumber })
            .getOne();

          if (existing) {
            runningNo++;
          } else {
            isDuplicate = false;
          }
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
    const number = String(runningNo).padStart(sequence.minDigits, "0");

    return sequence.formatPattern
      .replace("{prefix}", sequence.prefix)
      .replace("{yyyy}", yyyy)
      .replace("{yy}", yy)
      .replace("{mm}", mm)
      .replace("{number}", number);
  }

  static async seedDefaultSequences(): Promise<void> {
    const repo = AppDataSource.getRepository(NumberSequence);
    const defaults = [
      { sequenceKey: "offer", name: "Angebot", prefix: "A", minDigits: 2 },
      { sequenceKey: "order", name: "Auftrag", prefix: "B", minDigits: 2 },
      { sequenceKey: "transfer_order", name: "Bestellung", prefix: "DE", minDigits: 2 },
      { sequenceKey: "invoice", name: "Rechnung", prefix: "R", minDigits: 2 },
      {
        sequenceKey: "invoice_correction",
        name: "Rechnungskorrektur",
        prefix: "RK",
        minDigits: 2,
      },
      { sequenceKey: "delivery_note", name: "Lieferschein", prefix: "L", minDigits: 2 },
      {
        sequenceKey: "customer",
        name: "Kunde",
        prefix: "K",
        formatPattern: "{prefix}{number}",
        minDigits: 6,
      },
      {
        sequenceKey: "cargo",
        name: "Cargo",
        prefix: "C",
        formatPattern: "{prefix}{yyyy}-{number}",
        minDigits: 4,
      },
      {
        sequenceKey: "closed_ci",
        name: "Commercial Invoice",
        prefix: "CI",
        formatPattern: "{prefix}{yy}{mm}{number}",
        minDigits: 3,
      },
    ];

    for (const def of defaults) {
      const exists = await repo.findOne({
        where: { sequenceKey: def.sequenceKey },
      });
      if (!exists) {
        const startNo = def.sequenceKey === "customer" ? 83777 : 1;
        await repo.save(
          repo.create({ ...def, minDigits: def.minDigits, nextRunningNo: startNo }),
        );
      } else if (def.sequenceKey === "customer" && exists.nextRunningNo < 83777) {
        exists.nextRunningNo = 83777;
        await repo.save(exists);
      }
    }

  }
}