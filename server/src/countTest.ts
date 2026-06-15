import { AppDataSource } from "./config/database";
import { Item } from "./models/items";
import { WarehouseItem } from "./models/warehouse_items";
import { SupplierItem } from "./models/supplier_items";

async function main() {
  await AppDataSource.initialize();
  console.log("Database initialized");

  const activeItemSql = `(
    EXISTS (SELECT 1 FROM warehouse_item wi WHERE (wi.item_id = item.id OR (wi."ItemID_DE" = item."ItemID_DE" AND item."ItemID_DE" IS NOT NULL)) AND wi.is_active = 'Y')
    OR
    (NOT EXISTS (SELECT 1 FROM warehouse_item wi WHERE wi.item_id = item.id OR (wi."ItemID_DE" = item."ItemID_DE" AND item."ItemID_DE" IS NOT NULL)) AND item.isActive = 'Y')
  )`;

  // 1. Items without RMB Price
  const countDashboardRmb = await AppDataSource.getRepository(Item)
    .createQueryBuilder("item")
    .leftJoin("supplier_item", "si", "si.item_id = item.id AND si.is_default = 'Y'")
    .where(activeItemSql)
    .andWhere("(si.price_rmb IS NULL OR si.price_rmb = 0)")
    .getCount();

  const countControllerRmb = await AppDataSource.getRepository(Item)
    .createQueryBuilder("item")
    .leftJoin("supplier_item", "si_filter", "si_filter.item_id = item.id AND si_filter.is_default = 'Y'")
    .where("item.isActive = 'Y'")
    .andWhere("(si_filter.price_rmb IS NULL OR si_filter.price_rmb = 0)")
    .getCount();

  console.log("Items without RMB Price:");
  console.log("  Dashboard Count (activeItemSql):", countDashboardRmb);
  console.log("  Controller Count (item.isActive = 'Y'):", countControllerRmb);

  // 2. Items isPO = 'No' with URL = 'null'
  const countDashboardPo = await AppDataSource.getRepository(Item)
    .createQueryBuilder("item")
    .innerJoin("supplier_item", "si", "si.item_id = item.id AND si.is_default = 'Y'")
    .where(activeItemSql)
    .andWhere("si.is_po = 'No'")
    .andWhere("(si.url IS NULL OR si.url = '' OR si.url = 'null' OR si.url = 'NULL')")
    .getCount();

  const countControllerPo = await AppDataSource.getRepository(Item)
    .createQueryBuilder("item")
    .leftJoin("supplier_item", "si_filter", "si_filter.item_id = item.id AND si_filter.is_default = 'Y'")
    .where("item.isActive = 'Y'")
    .andWhere("si_filter.is_po = 'No'")
    .andWhere("(si_filter.url IS NULL OR si_filter.url = '' OR si_filter.url = 'null' OR si_filter.url = 'NULL')")
    .getCount();

  console.log("Items isPO = 'No' with URL = 'null':");
  console.log("  Dashboard Count (activeItemSql & innerJoin):", countDashboardPo);
  console.log("  Controller Count (item.isActive = 'Y' & leftJoin):", countControllerPo);

  // 3. Items without picture
  const countDashboardPic = await AppDataSource.getRepository(Item)
    .createQueryBuilder("item")
    .where(activeItemSql)
    .andWhere("(item.photo IS NULL OR item.photo = '' OR item.photo = 'null' OR item.photo = 'NULL')")
    .getCount();

  const countControllerPic = await AppDataSource.getRepository(Item)
    .createQueryBuilder("item")
    .where("item.isActive = 'Y'")
    .andWhere("(item.photo IS NULL OR item.photo = '' OR item.photo = 'null' OR item.photo = 'NULL')")
    .getCount();

  console.log("Items without picture:");
  console.log("  Dashboard Count (activeItemSql):", countDashboardPic);
  console.log("  Controller Count (item.isActive = 'Y'):", countControllerPic);

  await AppDataSource.destroy();
}

main().catch(console.error);
