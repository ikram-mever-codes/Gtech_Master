import { AppDataSource } from "../config/database";
import { TransferOrderItem } from "../models/transfer_order_items";
import { ItemLinkService } from "../services/item_link_service";

async function run() {
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  const orderItemRepo = queryRunner.manager.getRepository(TransferOrderItem);

  const rows = await orderItemRepo.find({
    where: { sourceItemId: null as any },
  });

  console.log(
    `Found ${rows.length} TransferOrderItem rows with no linked Item.`,
  );

  let created = 0;
  let failed = 0;

  for (const row of rows) {
    await queryRunner.startTransaction();
    try {
      const item = await ItemLinkService.resolveItem(queryRunner, {
        itemName: row.itemName,
        itemNo: row.itemNo,
        material: row.material,
        specification: row.specification,
        weight: row.weight,
        purchasePrice: row.purchasePrice,
        currency: row.purchaseCurrency,
        photo: row.photo,
        remark: row.remark_order_item || row.notes,
      });

      row.sourceItemId = String(item.id);
      await queryRunner.manager.getRepository(TransferOrderItem).save(row);

      await queryRunner.commitTransaction();
      created++;
      console.log(
        `  OK: TransferOrderItem ${row.id} -> Item ${item.id} (${row.itemName})`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      failed++;
      console.error(
        `  FAILED: TransferOrderItem ${row.id} (${row.itemName})`,
        err,
      );
    }
  }

  await queryRunner.release();
  console.log(`Done. Created: ${created}, Failed: ${failed}`);
  await AppDataSource.destroy();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Backfill script crashed:", err);
  process.exit(1);
});
