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

  // Valid order statuses from WaWi (only these should be processed)
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
    const startTime = Date.now();
    const result = {
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersRemoved: 0,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: [] as string[],
    };

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

      // Step 2: Read and process orders (ONLY orders with valid status)
      console.log("\n📦 Step 2: Processing orders...");
      const ordersFilePath = path.join(EtlController.publicPath, "orders.csv");
      const orderRecords = await EtlController.readCsv(ordersFilePath);

      if (orderRecords.length <= 1) {
        throw new Error("No orders found in orders.csv");
      }

      const orderRows = orderRecords.slice(1);
      console.log(`Found ${orderRows.length} orders in CSV`);

      // Filter orders based on WaWi status
      const validOrders = orderRows.filter((row) => {
        const status = row[2]?.toString().trim().toLowerCase();
        return EtlController.VALID_WAWI_STATUSES.includes(status);
      });

      console.log(
        `Filtered to ${validOrders.length} orders with valid status (${EtlController.VALID_WAWI_STATUSES.join(", ")})`,
      );
      console.log(
        `Skipped ${orderRows.length - validOrders.length} orders with other statuses`,
      );

      // Process ALL valid orders - create or update
      const orderMap = await EtlController.processAllOrders(
        validOrders,
        orderRepo,
        categoryRepo,
        result,
      );

      console.log(`\n✅ Orders complete: ${orderMap.size} total active orders`);

      // Step 3: Process order items
      console.log("\n📋 Step 3: Processing order items...");
      const orderItemsFilePath = path.join(
        EtlController.publicPath,
        "order_items.csv",
      );

      if (fs.existsSync(orderItemsFilePath)) {
        const itemRecords = await EtlController.readCsv(orderItemsFilePath);

        if (itemRecords.length > 1) {
          console.log(`Found ${itemRecords.length - 1} order items in CSV`);

          await EtlController.processAllOrderItems(
            itemRecords.slice(1),
            orderItemRepo,
            orderMap,
            result,
          );
        } else {
          console.log("No order items found in CSV");
        }
      } else {
        console.log("order_items.csv not found");
      }

      // Step 4: Handle orders with zero quantities or completed status
      console.log("\n🔍 Step 4: Checking for orders to remove...");
      const removedOrders = await EtlController.removeCompletedOrders(
        orderRepo,
        orderItemRepo,
        validOrders,
      );
      result.ordersRemoved = removedOrders.length;

      if (removedOrders.length > 0) {
        console.log(`\n✅ Removed ${removedOrders.length} orders:`);
        removedOrders.forEach((orderNo) => {
          console.log(`   - Order ${orderNo} removed from active list`);
        });
      } else {
        console.log("No orders found to remove");
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log("\n" + "=".repeat(50));
      console.log("✅ ETL process completed successfully");
      console.log("=".repeat(50));
      console.log(`Duration: ${duration} seconds`);
      console.log(
        `Orders: ${result.ordersCreated} created, ${result.ordersUpdated} updated`,
      );
      console.log(
        `Items: ${result.itemsCreated} created, ${result.itemsUpdated} updated`,
      );
      console.log(`Removed: ${result.ordersRemoved} orders`);

      res.status(200).json({
        success: true,
        message: "ETL process completed successfully",
        summary: {
          duration: `${duration}s`,
          ordersCreated: result.ordersCreated,
          ordersUpdated: result.ordersUpdated,
          ordersRemoved: result.ordersRemoved,
          itemsCreated: result.itemsCreated,
          itemsUpdated: result.itemsUpdated,
          errors: result.errors,
        },
      });
    } catch (error) {
      console.error("❌ ETL process failed:", error);
      next(error);
    }
  }

  /**
   * Process ALL valid orders - create or update
   */
  private static async processAllOrders(
    rows: any[],
    orderRepo: any,
    categoryRepo: any,
    result: any,
  ): Promise<Map<string, number>> {
    const orderMap = new Map<string, number>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const orderNo = row[0]?.toString().trim();
        if (!orderNo) {
          result.errors.push(`Row ${rowNum}: Missing order number`);
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
          result.errors.push(
            `Row ${rowNum}: Missing date_created for order ${orderNo}`,
          );
          continue;
        }

        // Get the original WaWi status
        const wawiStatus = row[2]?.toString().trim().toLowerCase() || "";
        let masterStatus = 20; // Default active status

        // Map WaWi status to Master status
        if (wawiStatus === "teilgeliefert") {
          masterStatus = 25; // Partially delivered
        } else if (wawiStatus === "in bearbeitung") {
          masterStatus = 20; // In progress
        }

        const orderData = {
          order_no: orderNo,
          category_id: databaseCategoryId,
          status: masterStatus,
          comment: row[3]?.toString().substring(0, 255) || "",
          date_created: dateCreated,
          date_emailed: dateEmailed,
          date_delivery: dateDelivery || dateCreated,
        };

        // Check if order exists
        const existingOrder = await orderRepo.findOne({
          where: { order_no: orderNo },
        });

        if (existingOrder) {
          // Update existing order
          await orderRepo.update({ order_no: orderNo }, orderData);
          orderMap.set(orderNo, existingOrder.id);
          result.ordersUpdated++;
        } else {
          // Create new order
          const newOrder = orderRepo.create(orderData);
          const saved = await orderRepo.save(newOrder);
          orderMap.set(orderNo, saved.id);
          result.ordersCreated++;
        }
        result.ordersProcessed++;

        if (result.ordersProcessed % 10 === 0) {
          console.log(
            `Progress: ${result.ordersProcessed}/${rows.length} orders processed`,
          );
        }
      } catch (error) {
        console.error(`Row ${rowNum}: Failed to process order:`, error);
        result.errors.push(
          `Row ${rowNum}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return orderMap;
  }

  /**
   * Process ALL order items - update existing items, create new ones
   */
  private static async processAllOrderItems(
    rows: any[],
    orderItemRepo: any,
    orderMap: Map<string, number>,
    result: any,
  ) {
    const itemRepo = AppDataSource.getRepository(Item);

    // Get all items for lookup
    const allItems = await itemRepo.find({ select: ["id", "ItemID_DE"] });
    const itemLookup = new Map(allItems.map((i: any) => [i.ItemID_DE, i.id]));

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
          result.errors.push(`Row ${rowNum}: Missing master_id`);
          result.itemsProcessed++;
          continue;
        }

        if (!orderNo) {
          result.errors.push(
            `Row ${rowNum}: Missing order_no for master_id ${masterId}`,
          );
          result.itemsProcessed++;
          continue;
        }

        // Get order ID
        const orderId = orderMap.get(orderNo);
        if (!orderId) {
          // Order might be filtered out due to status - log but don't fail
          console.warn(
            `Row ${rowNum}: Order ${orderNo} not found (filtered out?), skipping item ${masterId}`,
          );
          result.itemsProcessed++;
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
          status: qtyValue === 0 ? "CANCELLED" : "NSO",
        };

        if (existingItem) {
          // Update existing - check if anything changed
          const needsUpdate =
            existingItem.qty !== qtyValue ||
            existingItem.remark_de !== remarkDe ||
            existingItem.qty_delivered !== qtyDelivered ||
            existingItem.ItemID_DE !== itemIdDeValue;

          if (needsUpdate) {
            await orderItemRepo.update({ master_id: masterId }, itemData);
            result.itemsUpdated++;
            if (qtyValue === 0) {
              console.log(
                `⚠️  Item ${masterId} in order ${orderNo} quantity set to 0 (cancelled)`,
              );
            }
          } else {
            result.itemsSkipped++;
          }
        } else {
          // Insert new
          await orderItemRepo.save(orderItemRepo.create(itemData));
          result.itemsCreated++;
          if (qtyValue === 0) {
            console.log(
              `⚠️  Item ${masterId} created with 0 quantity for order ${orderNo}`,
            );
          }
        }
        result.itemsProcessed++;

        if (result.itemsProcessed % 50 === 0) {
          console.log(
            `Progress: ${result.itemsProcessed}/${rows.length} items processed`,
          );
        }
      } catch (error) {
        console.error(`Row ${rowNum}: Failed to process item:`, error);
        result.errors.push(
          `Row ${rowNum}: ${error instanceof Error ? error.message : String(error)}`,
        );
        result.itemsFailed++;
      }
    }

    console.log(
      `\n📊 Items: ${result.itemsCreated} created, ${result.itemsUpdated} updated, ${result.itemsFailed} failed`,
    );
  }

  /**
   * Remove orders that are no longer in WaWi or have zero quantity
   */
  private static async removeCompletedOrders(
    orderRepo: any,
    orderItemRepo: any,
    validOrdersFromCSV: any[],
  ): Promise<string[]> {
    const removedOrders: string[] = [];

    // Get all active orders in Master system
    const activeOrders = await orderRepo.find({
      where: {
        status: Not(999), // Not archived/completed
      },
      relations: ["orderItems"],
    });

    console.log(`Checking ${activeOrders.length} active orders...`);

    // Get order numbers from current CSV (valid orders only)
    const csvOrderNos = new Set(
      validOrdersFromCSV
        .map((row) => row[0]?.toString().trim())
        .filter(Boolean),
    );

    for (const order of activeOrders) {
      let shouldRemove = false;
      let reason = "";

      // Check if order is still in CSV (still in WaWi with valid status)
      if (!csvOrderNos.has(order.order_no)) {
        shouldRemove = true;
        reason = "not in WaWi or has invalid status";
      }
      // Check if order has any items with quantity > 0
      else if (!order.orderItems || order.orderItems.length === 0) {
        shouldRemove = true;
        reason = "no order items";
      } else {
        const hasValidItems = order.orderItems.some(
          (item: any) =>
            item.qty > 0 && item.qty !== null && item.qty !== undefined,
        );
        if (!hasValidItems) {
          shouldRemove = true;
          reason = "all items have zero quantity";
        }
      }

      if (shouldRemove) {
        console.log(`🗑️  Removing order ${order.order_no} (${reason})`);

        // Archive the order (status 999) instead of deleting
        await orderRepo.update(order.id, {
          status: 999, // Completed/Archived
          comment: order.comment
            ? `${order.comment} - [ARCHIVED: ${reason} at ${new Date().toISOString()}]`
            : `[ARCHIVED: ${reason} at ${new Date().toISOString()}]`,
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
