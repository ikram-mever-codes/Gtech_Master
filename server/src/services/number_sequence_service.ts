import { AppDataSource } from "../config/database";
import { NumberSequence } from "../models/number_sequence";

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

      const runningNo = sequence.nextRunningNo;
      sequence.nextRunningNo = runningNo + 1;
      await manager.save(sequence);

      return this.formatNumber(sequence, runningNo);
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

  // Run once (e.g. on app bootstrap or via a migration) to create the
  // sequences for Customer Documents.
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
        await repo.save(
          repo.create({ ...def, minDigits: def.minDigits, nextRunningNo: 1 }),
        );
      }
    }
  }
}