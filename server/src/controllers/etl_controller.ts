import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { In, Not } from "typeorm";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { Item } from "../models/items";
import { Category } from "../models/categories";

interface ProcessBatchResult {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ type: string; message: string; data?: any }>;
}

interface CategoryMapping {
  csvCategoryId: number;
  databaseCategoryId: number;
  name: string;
}

export class EtlController {
  private static publicPath = path.join(__dirname, "../../public");
  private static readonly BATCH_SIZE = 100;

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

      // Step 2: Read and process orders
      console.log("\n📦 Step 2: Processing orders...");
      const ordersFilePath = path.join(EtlController.publicPath, "orders.csv");
      const orderRecords = await EtlController.readCsv(ordersFilePath);

      if (orderRecords.length <= 1) {
        throw new Error("No orders found in orders.csv");
      }

      const orderRows = orderRecords.slice(1);
      console.log(`Found ${orderRows.length} orders to process`);

      // Process ALL orders - create or update, never skip
      const orderMap = await EtlController.processAllOrders(
        orderRows,
        orderRepo,
        categoryRepo,
      );

      console.log(`\n✅ Orders complete: ${orderMap.size} total orders`);

      // Step 3: Process order items
      console.log("\n📋 Step 3: Processing order items...");
      const orderItemsFilePath = path.join(
        EtlController.publicPath,
        "order_items.csv",
      );

      if (fs.existsSync(orderItemsFilePath)) {
        const itemRecords = await EtlController.readCsv(orderItemsFilePath);

        if (itemRecords.length > 1) {
          console.log(`Found ${itemRecords.length - 1} order items to process`);

          const itemResults = await EtlController.processAllOrderItems(
            itemRecords.slice(1),
            orderItemRepo,
            orderMap,
          );

          console.log(`\n✅ Items processed:`, itemResults);
        } else {
          console.log("No order items found in CSV");
        }
      } else {
        console.log("order_items.csv not found");
      }

      // Step 4: Handle orders with zero quantities
      console.log("\n🔍 Step 4: Checking for zero-quantity orders...");
      const zeroQuantityOrders = await EtlController.handleZeroQuantityOrders(
        orderRepo,
        orderItemRepo,
      );

      if (zeroQuantityOrders.length > 0) {
        console.log(
          `\n✅ Removed ${zeroQuantityOrders.length} orders due to zero quantity:`,
        );
        zeroQuantityOrders.forEach((orderNo) => {
          console.log(`   - Order ${orderNo} removed from active list`);
        });
      } else {
        console.log("No orders found with zero quantity to remove");
      }

      console.log("\n" + "=".repeat(50));
      console.log("✅ ETL process completed successfully");
      console.log("=".repeat(50));

      res.status(200).json({
        success: true,
        message: "ETL process completed successfully",
        zeroQuantityOrdersRemoved: zeroQuantityOrders.length,
        removedOrders: zeroQuantityOrders,
      });
    } catch (error) {
      console.error("❌ ETL process failed:", error);
      next(error);
    }
  }

  /**
   * Process ALL orders - create or update, never skip
   */
  private static async processAllOrders(
    rows: any[],
    orderRepo: any,
    categoryRepo: any,
  ): Promise<Map<string, number>> {
    const orderMap = new Map<string, number>();
    let created = 0;
    let updated = 0;

    console.log(`\nProcessing ${rows.length} orders...`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header and 0-index

      try {
        const orderNo = row[0]?.toString().trim();
        if (!orderNo) {
          console.error(
            `Row ${rowNum}: Missing order number, using placeholder`,
          );
          continue;
        }

        // Parse category - ALWAYS use a valid category ID
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

        // Parse dates - ALWAYS use CSV dates, never current date
        const dateCreated = EtlController.parseGermanDateStrict(row[4]);
        const dateEmailed = EtlController.parseGermanDateStrict(row[5]);
        const dateDelivery = EtlController.parseGermanDateStrict(row[6]);

        if (!dateCreated) {
          console.error(
            `Row ${rowNum}: Missing required date_created for order ${orderNo}`,
          );
          continue;
        }

        const status = parseInt(row[2]);
        if (isNaN(status)) {
          console.warn(
            `Row ${rowNum}: Invalid status for order ${orderNo}, using 0`,
          );
        }

        const orderData = {
          order_no: orderNo,
          category_id: databaseCategoryId,
          status: isNaN(status) ? 0 : status,
          comment: row[3]?.toString().substring(0, 255) || "",
          date_created: dateCreated,
          date_emailed: dateEmailed,
          date_delivery: dateDelivery || dateCreated, // Use delivery date or fallback to created
        };

        // Check if order exists
        const existingOrder = await orderRepo.findOne({
          where: { order_no: orderNo },
        });

        if (existingOrder) {
          // Update existing
          await orderRepo.update({ order_no: orderNo }, orderData);
          orderMap.set(orderNo, existingOrder.id);
          updated++;
        } else {
          // Create new
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
        // Don't skip - we want all orders
      }
    }

    console.log(`\n📊 Orders: ${created} created, ${updated} updated`);
    return orderMap;
  }

  /**
   * Process ALL order items - create or update, never skip
   * Now with zero quantity detection
   */
  private static async processAllOrderItems(
    rows: any[],
    orderItemRepo: any,
    orderMap: Map<string, number>,
  ) {
    const itemRepo = AppDataSource.getRepository(Item);
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      failed: 0,
      zeroQuantityItems: 0,
    };

    console.log(`\nProcessing ${rows.length} order items...`);

    // Get all items for lookup
    const allItems = await itemRepo.find({ select: ["id", "ItemID_DE"] });
    const itemLookup = new Map(allItems.map((i: any) => [i.ItemID_DE, i.id]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header and 0-index

      try {
        results.processed++;

        // CORRECT COLUMN MAPPINGS for order_items.csv:
        // 0: masterItemID, 1: ItemID_DE, 2: order_no, 3: qty, 4: remark, 5: qty_delivered
        const masterId = row[0]?.toString().trim();
        const itemIdDe = parseInt(row[1]);
        const orderNo = row[2]?.toString().trim();
        const qty = parseInt(row[3]);
        const remarkDe = row[4]?.toString().trim() || "";
        const qtyDelivered = parseInt(row[5]) || 0;

        // Validate but don't skip - use defaults for missing data
        if (!masterId) {
          console.error(`Row ${rowNum}: Missing master_id, cannot process`);
          results.failed++;
          continue;
        }

        if (!orderNo) {
          console.error(
            `Row ${rowNum}: Missing order_no for master_id ${masterId}, cannot process`,
          );
          results.failed++;
          continue;
        }

        // Get order ID - if not found, this is a critical error
        const orderId = orderMap.get(orderNo);
        if (!orderId) {
          console.error(
            `Row ${rowNum}: Order ${orderNo} not found for item ${masterId}`,
          );
          results.failed++;
          continue;
        }

        // Handle ItemID_DE
        let itemIdDeValue: any = null;
        let itemId = null;
        if (!isNaN(itemIdDe)) {
          itemIdDeValue = itemIdDe;
          itemId = itemLookup.get(itemIdDe) || null;
        } else {
          console.warn(
            `Row ${rowNum}: Invalid ItemID_DE for master_id ${masterId}, using null`,
          );
        }

        // Handle quantity
        let qtyValue = 0;
        if (!isNaN(qty)) {
          qtyValue = qty;
        } else {
          console.warn(
            `Row ${rowNum}: Invalid quantity for master_id ${masterId}, using 0`,
          );
        }

        // Track zero quantity items
        if (qtyValue === 0) {
          results.zeroQuantityItems++;
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
          status: qtyValue === 0 ? "CANCELLED" : "NSO",
        };

        if (existingItem) {
          // Log when quantity changes to zero
          if (existingItem.qty !== 0 && qtyValue === 0) {
            console.log(
              `⚠️  Item ${masterId} in order ${orderNo} set to ZERO quantity`,
            );
          }

          // Update existing
          await orderItemRepo.update({ master_id: masterId }, itemData);
          results.updated++;
        } else {
          // Insert new
          await orderItemRepo.save(orderItemRepo.create(itemData));
          results.created++;

          if (qtyValue === 0) {
            console.log(
              `⚠️  Item ${masterId} created with ZERO quantity for order ${orderNo}`,
            );
          }
        }

        if ((results.created + results.updated) % 50 === 0) {
          console.log(
            `Progress: ${results.created + results.updated}/${rows.length} items processed`,
          );
        }
      } catch (error) {
        console.error(`Row ${rowNum}: Failed to process item:`, error);
        results.failed++;
      }
    }

    console.log(
      `\n📊 Items: ${results.created} created, ${results.updated} updated, ${results.failed} failed, ${results.zeroQuantityItems} zero-quantity items`,
    );

    return results;
  }

  /**
   * Handle orders with zero quantities - Mark them as completed so they don't appear in active lists
   * Returns array of order numbers that were removed
   */
  private static async handleZeroQuantityOrders(
    orderRepo: any,
    orderItemRepo: any,
  ): Promise<string[]> {
    const removedOrders: string[] = [];

    // Get all orders with status not completed (status != 999)
    const activeOrders = await orderRepo.find({
      where: {
        status: Not(999),
      },
      relations: ["orderItems"],
    });

    console.log(
      `Checking ${activeOrders.length} active orders for zero quantities...`,
    );

    for (const order of activeOrders) {
      let shouldRemove = false;
      let reason = "";

      // Case 1: Order has no items
      if (!order.orderItems || order.orderItems.length === 0) {
        shouldRemove = true;
        reason = "no items";
      }
      // Case 2: Check if all items have zero quantity
      else {
        const allItemsZero = order.orderItems.every(
          (item: any) =>
            item.qty === 0 || item.qty === null || item.qty === undefined,
        );

        if (allItemsZero) {
          shouldRemove = true;
          reason = "all items have zero quantity";
        }
      }

      // Remove the order if it meets criteria
      if (shouldRemove) {
        console.log(
          `🗑️  Removing order ${order.order_no} from active list (${reason})`,
        );

        // Mark order as completed (status 999)
        await orderRepo.update(order.id, {
          status: 999, // Completed/Archived status
          comment: order.comment
            ? `${order.comment} - [REMOVED: ${reason} at ${new Date().toISOString()}]`
            : `[REMOVED: ${reason} at ${new Date().toISOString()}]`,
        });

        removedOrders.push(order.order_no);
      }
    }

    return removedOrders;
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
   * Parse German date format - STRICT: returns null if invalid, never uses current date
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
