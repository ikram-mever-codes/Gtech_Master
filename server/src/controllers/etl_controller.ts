import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { In } from "typeorm";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { Item } from "../models/items";
import { Category } from "../models/categories";

interface CategoryMapping {
  csvCategoryId: number;
  databaseCategoryId: number;
  name: string;
}

export class EtlController {
  private static publicPath = path.join(__dirname, "../../public");
  private static readonly BATCH_SIZE = 100;

  // Valid order statuses from WaWi (for active orders)
  private static readonly VALID_WAWI_STATUSES = [
    "in Bearbeitung",
    "teilgeliefert",
  ];

  // Category mapping based on your database
  private static readonly CATEGORY_MAPPING: CategoryMapping[] = [
    { csvCategoryId: 26, databaseCategoryId: 55, name: "STD" },
    { csvCategoryId: 18, databaseCategoryId: 56, name: "GBL" },
    { csvCategoryId: 13, databaseCategoryId: 57, name: "GTR" },
    { csvCategoryId: 21, databaseCategoryId: 58, name: "PRO" },
    { csvCategoryId: 20, databaseCategoryId: 59, name: "ERS" },
    { csvCategoryId: 8, databaseCategoryId: 60, name: "TBA" },
  ];

  private static readonly CATEGORY_MAP = new Map(
    EtlController.CATEGORY_MAPPING.map((m) => [
      m.csvCategoryId,
      m.databaseCategoryId,
    ]),
  );

  // German month mapping for date parsing
  private static readonly MONTH_MAP: { [key: string]: string } = {
    Jan: "01",
    Feb: "02",
    Mär: "03",
    Apr: "04",
    Mai: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Okt: "10",
    Nov: "11",
    Dez: "12",
  };

  public static async findTargetDate(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      console.log("=".repeat(50));
      console.log("Starting ETL process...");
      console.log("=".repeat(50));

      const orderRepo: any = AppDataSource.getRepository(Order);
      const orderItemRepo = AppDataSource.getRepository(OrderItem);
      const categoryRepo = AppDataSource.getRepository(Category);

      // Step 1: Sync categories
      console.log("\n📁 Step 1: Syncing categories...");
      await EtlController.syncRequiredCategories(categoryRepo);

      // Step 2: Read orders from CSV
      console.log("\n📦 Step 2: Reading orders from CSV...");
      const ordersFilePath = path.join(EtlController.publicPath, "orders.csv");
      const orderRecords = await EtlController.readCsv(ordersFilePath);

      if (orderRecords.length <= 1) {
        throw new Error("No orders found in orders.csv");
      }

      const orderRows = orderRecords.slice(1);
      console.log(`Found ${orderRows.length} orders in CSV`);

      // Step 3: Process ALL orders from CSV (create or update based on status)
      console.log("\n📋 Step 3: Processing orders...");
      const orderMap = await EtlController.processAllOrders(
        orderRows,
        orderRepo,
        categoryRepo,
      );

      console.log(`\n✅ Orders processed: ${orderMap.size} orders in database`);

      // Step 4: Process order items
      console.log("\n📋 Step 4: Processing order items...");
      const orderItemsFilePath = path.join(
        EtlController.publicPath,
        "order_items.csv",
      );

      if (fs.existsSync(orderItemsFilePath)) {
        const itemRecords = await EtlController.readCsv(orderItemsFilePath);

        if (itemRecords.length > 1) {
          console.log(`Found ${itemRecords.length - 1} order items in CSV`);

          await EtlController.processOrderItems(
            itemRecords.slice(1),
            orderItemRepo,
            orderMap,
          );
        } else {
          console.log("No order items found in CSV");
        }
      } else {
        console.log("order_items.csv not found");
      }

      // Step 5: Delete orders that are NOT in the CSV (orders removed from MIS/WaWi)
      console.log("\n🗑️ Step 5: Removing orders not in MIS...");
      const deletedOrders = await EtlController.deleteOrdersNotInCSV(
        orderRepo,
        orderItemRepo,
        orderRows, // Use ALL orders from CSV for comparison
      );

      if (deletedOrders.length > 0) {
        console.log(`\n✅ Removed ${deletedOrders.length} orders not in MIS:`);
        deletedOrders.forEach((orderNo) => {
          console.log(`   - Order ${orderNo} deleted`);
        });
      } else {
        console.log("No orders to remove");
      }

      console.log("\n" + "=".repeat(50));
      console.log("✅ ETL process completed successfully");
      console.log("=".repeat(50));

      res.status(200).json({
        success: true,
        message: "ETL process completed successfully",
        summary: {
          ordersProcessed: orderRows.length,
          ordersDeleted: deletedOrders.length,
        },
      });
    } catch (error) {
      console.error("❌ ETL process failed:", error);
      next(error);
    }
  }

  /**
   * Process ALL orders from CSV - CREATE or UPDATE
   * Orders with invalid status (completed/cancelled) will be marked as inactive
   */
  private static async processAllOrders(
    rows: any[],
    orderRepo: any,
    categoryRepo: any,
  ): Promise<Map<string, number>> {
    const orderMap = new Map<string, number>();
    let created = 0;
    let updated = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const orderNo = row[0]?.toString().trim();
        if (!orderNo) {
          console.error(`Row ${rowNum}: Missing order number`);
          continue;
        }

        // Parse category
        const csvCategoryId = parseInt(row[1]);
        let databaseCategoryId = 55; // Default STD

        if (!isNaN(csvCategoryId)) {
          try {
            databaseCategoryId = await EtlController.getOrCreateCategory(
              csvCategoryId,
              categoryRepo,
            );
          } catch (error) {
            console.warn(
              `Row ${rowNum}: Error with category ${csvCategoryId}, using default 55`,
            );
          }
        }

        // Parse dates
        const dateCreated = EtlController.parseGermanDateStrict(row[4]);
        const dateEmailed = EtlController.parseGermanDateStrict(row[5]);
        const dateDelivery = EtlController.parseGermanDateStrict(row[6]);

        if (!dateCreated) {
          console.error(
            `Row ${rowNum}: Missing date_created for order ${orderNo}, using current date`,
          );
          // Don't skip - use current date as fallback
          const currentDate = new Date().toISOString();
          var finalDateCreated = currentDate;
          var finalDateDelivery = dateDelivery || currentDate;
        } else {
          var finalDateCreated = dateCreated;
          var finalDateDelivery = dateDelivery || dateCreated;
        }

        // Get the original WaWi status
        const wawiStatus = row[2]?.toString().trim().toLowerCase() || "";

        // Determine master status based on WaWi status
        let masterStatus = 20; // Default active status

        if (wawiStatus === "teilgeliefert") {
          masterStatus = 25; // Partially delivered
        } else if (wawiStatus === "in bearbeitung") {
          masterStatus = 20; // In progress
        } else {
          // Orders with other statuses (completed, cancelled, etc.) are marked as inactive
          masterStatus = 999; // Completed/Archived
          console.log(
            `Row ${rowNum}: Order ${orderNo} has status "${wawiStatus}" - marking as inactive (999)`,
          );
        }

        const orderData = {
          order_no: orderNo,
          category_id: databaseCategoryId,
          status: masterStatus,
          comment: row[3]?.toString().substring(0, 255) || "",
          date_created: finalDateCreated,
          date_emailed: dateEmailed,
          date_delivery: finalDateDelivery,
        };

        // Check if order exists
        const existingOrder = await orderRepo.findOne({
          where: { order_no: orderNo },
        });

        if (existingOrder) {
          // UPDATE existing order
          await orderRepo.update({ order_no: orderNo }, orderData);
          orderMap.set(orderNo, existingOrder.id);
          updated++;
        } else {
          // CREATE new order
          const newOrder = orderRepo.create(orderData);
          const saved = await orderRepo.save(newOrder);
          orderMap.set(orderNo, saved.id);
          created++;
        }

        if ((created + updated) % 10 === 0) {
          console.log(
            `Progress: ${created + updated}/${rows.length} orders processed`,
          );
        }
      } catch (error) {
        console.error(`Row ${rowNum}: Failed to process order:`, error);
      }
    }

    console.log(`\n📊 Orders: ${created} created, ${updated} updated`);
    return orderMap;
  }

  /**
   * Process order items - CREATE or UPDATE existing items
   */
  private static async processOrderItems(
    rows: any[],
    orderItemRepo: any,
    orderMap: Map<string, number>,
  ) {
    const itemRepo = AppDataSource.getRepository(Item);
    let created = 0;
    let updated = 0;
    let failed = 0;

    // Get all items for lookup
    const allItems = await itemRepo.find({ select: ["id", "ItemID_DE"] });
    const itemLookup = new Map(allItems.map((i: any) => [i.ItemID_DE, i.id]));

    console.log(`\nProcessing ${rows.length} order items...`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        // CORRECT COLUMN MAPPINGS for order_items.csv:
        // 0: masterItemID, 1: ItemID_DE, 2: order_no, 3: qty, 4: remark, 5: qty_delivered
        const masterId = row[0]?.toString().trim();
        const itemIdDe = parseInt(row[1]);
        const orderNo = row[2]?.toString().trim();
        const qty = parseInt(row[3]);
        const remarkDe = row[4]?.toString().trim() || "";
        const qtyDelivered = parseInt(row[5]) || 0;

        if (!masterId) {
          console.error(`Row ${rowNum}: Missing master_id`);
          failed++;
          continue;
        }

        if (!orderNo) {
          console.error(
            `Row ${rowNum}: Missing order_no for master_id ${masterId}`,
          );
          failed++;
          continue;
        }

        // Get order ID
        const orderId = orderMap.get(orderNo);
        if (!orderId) {
          console.warn(
            `Row ${rowNum}: Order ${orderNo} not found, skipping item ${masterId}`,
          );
          failed++;
          continue;
        }

        // Handle ItemID_DE
        let itemIdDeValue: any = null;
        let itemId = null;
        if (!isNaN(itemIdDe)) {
          itemIdDeValue = itemIdDe;
          itemId = itemLookup.get(itemIdDe) || null;
        }

        // Handle quantity
        let qtyValue = 0;
        if (!isNaN(qty)) {
          qtyValue = qty;
        }

        // Check if order item exists
        const existingItem = await orderItemRepo.findOne({
          where: { master_id: masterId },
        });

        const itemData = {
          order_id: orderId,
          master_id: masterId,
          ItemID_DE: itemIdDeValue,
          item_id: itemId,
          qty: qtyValue,
          remark_de: remarkDe,
          qty_delivered: qtyDelivered,
          qty_label: qtyValue,
          status: "NSO",
        };

        if (existingItem) {
          // UPDATE existing item if changed
          const needsUpdate =
            existingItem.qty !== qtyValue ||
            existingItem.remark_de !== remarkDe ||
            existingItem.qty_delivered !== qtyDelivered ||
            existingItem.ItemID_DE !== itemIdDeValue;

          if (needsUpdate) {
            await orderItemRepo.update({ master_id: masterId }, itemData);
            updated++;
          }
        } else {
          // CREATE new item
          await orderItemRepo.save(orderItemRepo.create(itemData));
          created++;
        }

        if ((created + updated) % 50 === 0) {
          console.log(
            `Progress: ${created + updated}/${rows.length} items processed`,
          );
        }
      } catch (error) {
        console.error(`Row ${rowNum}: Failed to process item:`, error);
        failed++;
      }
    }

    console.log(
      `\n📊 Items: ${created} created, ${updated} updated, ${failed} failed`,
    );
  }

  /**
   * DELETE orders that are NOT in the CSV (orders removed from MIS/WaWi)
   */
  private static async deleteOrdersNotInCSV(
    orderRepo: any,
    orderItemRepo: any,
    allOrdersFromCSV: any[],
  ): Promise<string[]> {
    const deletedOrders: string[] = [];

    // Get all orders currently in database
    const allOrdersInDb = await orderRepo.find({
      select: ["id", "order_no"],
    });

    // Get order numbers from ALL orders in CSV (not just filtered ones)
    const csvOrderNos = new Set(
      allOrdersFromCSV.map((row) => row[0]?.toString().trim()).filter(Boolean),
    );

    console.log(`Found ${allOrdersInDb.length} orders in database`);
    console.log(`Found ${csvOrderNos.size} orders in CSV`);

    // Find orders in database that are NOT in CSV
    const ordersToDelete = allOrdersInDb.filter(
      (order: { order_no: string }) => !csvOrderNos.has(order.order_no),
    );

    if (ordersToDelete.length === 0) {
      return [];
    }

    console.log(`\n🗑️ Deleting ${ordersToDelete.length} orders not in MIS...`);

    for (const order of ordersToDelete) {
      try {
        // First delete all order items for this order
        await orderItemRepo.delete({ order_id: order.id });

        // Then delete the order itself
        await orderRepo.delete({ id: order.id });

        deletedOrders.push(order.order_no);
        console.log(`   ✅ Deleted order ${order.order_no}`);
      } catch (error) {
        console.error(`   ❌ Failed to delete order ${order.order_no}:`, error);
      }
    }

    return deletedOrders;
  }

  /**
   * Sync required categories - create if not exist
   */
  private static async syncRequiredCategories(
    categoryRepo: any,
  ): Promise<void> {
    for (const mapping of EtlController.CATEGORY_MAPPING) {
      try {
        let category = await categoryRepo.findOne({
          where: [{ id: mapping.databaseCategoryId }, { de_cat: mapping.name }],
        });

        if (!category) {
          console.log(`Creating category: ${mapping.name}`);
          category = categoryRepo.create({
            id: mapping.databaseCategoryId,
            de_cat: mapping.name,
            name: mapping.name,
            is_ignored_value: "N",
          });
          await categoryRepo.save(category);
        }
      } catch (error: any) {
        if (error.code === "23505") {
          console.log(`Category ${mapping.name} already exists`);
        } else {
          console.error(`Error creating category ${mapping.name}:`, error);
        }
      }
    }
  }

  /**
   * Get or create category - ALWAYS returns a valid category ID
   */
  private static async getOrCreateCategory(
    csvId: number,
    categoryRepo: any,
  ): Promise<number> {
    // Check if it's in our hardcoded map
    let dbId = EtlController.CATEGORY_MAP.get(csvId);

    if (dbId) {
      const exists = await categoryRepo.findOne({ where: { id: dbId } });
      if (exists) return dbId;
    }

    // Look for it by name
    const dynamicDeCat = `C${csvId}`.substring(0, 5);
    let category = await categoryRepo.findOne({
      where: { de_cat: dynamicDeCat },
    });

    if (!category) {
      console.log(`Creating missing category for CSV ID: ${csvId}`);
      category = categoryRepo.create({
        de_cat: dynamicDeCat,
        name: `Imported ${csvId}`,
        is_ignored_value: "N",
      });
      category = await categoryRepo.save(category);
    }

    // Cache it
    EtlController.CATEGORY_MAP.set(csvId, category.id);
    return category.id;
  }

  /**
   * Parse German date format - STRICT: returns null if invalid
   */
  private static parseGermanDateStrict(dateStr: string): string | null {
    if (!dateStr || dateStr.trim() === "") return null;

    try {
      let cleaned = dateStr.trim().replace(/\s+/g, " ");

      // Replace German months with numbers
      for (const [de, num] of Object.entries(EtlController.MONTH_MAP)) {
        cleaned = cleaned.replace(new RegExp(de, "g"), num);
      }

      const date = new Date(cleaned);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: "${dateStr}"`);
        return null;
      }
      return date.toISOString();
    } catch (error) {
      console.warn(`Error parsing date: "${dateStr}"`);
      return null;
    }
  }

  /**
   * Helper: Read CSV file
   */
  private static readCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve) => {
      const records: any[] = [];

      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${path.basename(filePath)}`);
        return resolve([]);
      }

      fs.createReadStream(filePath)
        .pipe(
          parse({
            delimiter: ",",
            relax_column_count: true,
            skip_empty_lines: true,
            trim: true,
          }),
        )
        .on("data", (data: any) => records.push(data))
        .on("end", () => {
          console.log(
            `Loaded ${records.length} rows from ${path.basename(filePath)}`,
          );
          resolve(records);
        })
        .on("error", (err: any) => {
          console.error(`Error reading CSV: ${path.basename(filePath)}`, err);
          resolve([]);
        });
    });
  }

  // Placeholder methods
  public static async whareHouseSync(req: Request, res: Response) {
    res.status(200).json({
      success: true,
      message: "Warehouse sync not implemented",
    });
  }

  public static async synchIDs() {
    console.log("synchIDs called - not implemented");
  }
}
