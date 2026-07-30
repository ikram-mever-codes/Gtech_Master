import { AppDataSource } from "../config/database";

export const addBestellungStatusMigration = async () => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  try {
    const tableColumns = await queryRunner.query(
      `SHOW COLUMNS FROM \`order\` LIKE 'bestellung_status'`
    );
    if (tableColumns.length === 0) {
      await queryRunner.query(
        `ALTER TABLE \`order\` ADD COLUMN \`bestellung_status\` varchar(50) NULL DEFAULT NULL`
      );
      console.log("[Migration] Added bestellung_status column to order table");
    } else {
      console.log("[Migration] bestellung_status column already exists");
    }
  } catch (err) {
    console.error("[Migration] Failed to add bestellung_status column:", err);
  } finally {
    await queryRunner.release();
  }
};
