import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { Not, Like, In, QueryFailedError } from "typeorm";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { Item } from "../models/items";
import { Category } from "../models/categories";

interface ProcessBatchResult {
  processed: number;
  created: number;
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

  /**
   * Main ETL process with comprehensive error handling
   */
  public static async findTargetDate(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      console.log("Starting ETL process...");

      const orderRepo: any = AppDataSource.getRepository(Order);
      const orderItemRepo = AppDataSource.getRepository(OrderItem);
      const categoryRepo = AppDataSource.getRepository(Category);

      // FIX 1: Use the sync method instead of the strict validation method
      await EtlController.syncRequiredCategories(categoryRepo);

      const ordersFilePath = path.join(EtlController.publicPath, "orders.csv");
      const orderRecords = await EtlController.readCsv(ordersFilePath);

      const orderMap = new Map<string, number>();
      const orderRows = orderRecords.slice(1);

      for (const row of orderRows) {
        const orderNo = row[0]?.toString().trim();
        if (!orderNo) continue;
        ``;
        let order = await orderRepo.findOne({ where: { order_no: orderNo } });

        if (!order) {
          const csvCategoryId = parseInt(row[1]);
          if (isNaN(csvCategoryId)) continue;

          // FIX 2: Get or Create the category dynamically
          const databaseCategoryId = await EtlController.getOrCreateCategory(
            csvCategoryId,
            categoryRepo,
          );

          const status = parseInt(row[2]) || 0;
          const dateCreated = EtlController.validateDate(
            row[4],
            "date_created",
          );
          const dateEmailed = EtlController.validateDate(
            row[5],
            "date_emailed",
            true,
          );
          const dateDelivery = EtlController.validateDate(
            row[6],
            "date_delivery",
          );

          const newOrder = orderRepo.create({
            order_no: orderNo,
            category_id: databaseCategoryId,
            status: status,
            comment: row[3]?.toString().substring(0, 255) || "",
            date_created: dateCreated,
            date_emailed: dateEmailed,
            date_delivery: dateDelivery,
          });

          order = await orderRepo.save(newOrder);
        }
        orderMap.set(orderNo, order.id);
      }

      // Process items...
      const orderItemsFilePath = path.join(
        EtlController.publicPath,
        "order_items.csv",
      );
      if (fs.existsSync(orderItemsFilePath)) {
        const itemRecords = await EtlController.readCsv(orderItemsFilePath);
        await EtlController.processOrderItemBatch(
          itemRecords.slice(1),
          orderItemRepo,
          orderMap,
        );
      }

      res.status(200).json({ success: true, message: "ETL process completed" });
    } catch (error) {
      console.error("ETL process failed:", error);
      next(error);
    }
  }
  private static async processOrderBatch(
    rows: any[],
    orderRepo: any,
    categoryRepo: any,
  ): Promise<ProcessBatchResult> {
    const results: ProcessBatchResult = {
      processed: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (const row of rows) {
      try {
        results.processed++;

        // Ensure row has enough columns
        if (!row || row.length < 7) {
          throw new Error(`Invalid row format: ${JSON.stringify(row)}`);
        }

        const orderNo = row[0]?.toString().trim();
        if (!orderNo) {
          throw new Error("Order number is empty");
        }

        const existingOrder = await orderRepo.findOne({
          where: { order_no: orderNo },
        });

        if (existingOrder) {
          console.log(`Order ${orderNo} already exists, skipping`);
          results.skipped++;
          continue;
        }

        const csvCategoryId = parseInt(row[1]);
        if (isNaN(csvCategoryId)) {
          throw new Error(`Invalid category ID: ${row[1]}`);
        }

        // Map CSV category ID to database category ID
        const databaseCategoryId =
          EtlController.CATEGORY_MAP.get(csvCategoryId);
        if (!databaseCategoryId) {
          throw new Error(`No mapping found for category ID ${csvCategoryId}`);
        }

        // Verify category exists in database
        const category = await categoryRepo.findOne({
          where: { id: databaseCategoryId },
        });

        if (!category) {
          throw new Error(
            `Category ID ${databaseCategoryId} not found in database`,
          );
        }

        // Parse status
        const status = parseInt(row[2]);
        if (isNaN(status)) {
          throw new Error(`Invalid status: ${row[2]}`);
        }

        // Validate and parse dates
        const dateCreated = EtlController.validateDate(row[4], "date_created");
        const dateEmailed = EtlController.validateDate(
          row[5],
          "date_emailed",
          true,
        );
        const dateDelivery = EtlController.validateDate(
          row[6],
          "date_delivery",
        );

        // Create order
        const newOrder = orderRepo.create({
          order_no: orderNo,
          category_id: databaseCategoryId,
          status: status,
          comment: row[3]?.toString().substring(0, 255) || "", // Truncate if needed
          date_created: dateCreated,
          date_emailed: dateEmailed,
          date_delivery: dateDelivery,
        });

        await orderRepo.save(newOrder);
        results.created++;

        console.log(`Order ${orderNo} created successfully`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          type: "order_processing_error",
          message: error instanceof Error ? error.message : "Unknown error",
          data: { row, orderNo: row?.[0] },
        });

        console.error(`Failed to process order ${row?.[0]}`, error);
      }
    }

    return results;
  }

  /**
   * Process a batch of order items
   */
  private static async processOrderItemBatch(
    rows: any[],
    orderItemRepo: any,
    existingOrders: Map<string, number>, // Map of order_no -> order_id
  ) {
    const itemRepo = AppDataSource.getRepository(Item); // Get Item Repository
    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      failed: 0,
    };

    for (const row of rows) {
      try {
        results.processed++;

        const masterId = row[0]?.toString().trim();
        const itemIdDe = parseInt(row[1]); // This is the ItemID_DE from CSV
        const orderNo = row[2]?.toString().trim();
        const qty = parseInt(row[3]);
        const remarkDe = row[4]?.toString().trim() || "";
        const qtyDelivered = parseInt(row[5]) || 0;

        if (!masterId || !orderNo || isNaN(qty) || isNaN(itemIdDe)) {
          results.skipped++;
          continue;
        }

        const orderId = existingOrders.get(orderNo);
        if (!orderId) {
          results.skipped++;
          continue;
        }

        // --- NEW LOGIC: LINKING TO ITEM ---
        // Look up the actual Item primary key (id) using the CSV's ItemID_DE
        const actualItem = await itemRepo.findOne({
          where: { ItemID_DE: itemIdDe },
          select: ["id"],
        });

        if (!actualItem) {
          console.warn(
            `Item with ItemID_DE ${itemIdDe} not found in Items table. Link will be missing.`,
          );
        }

        const existingItem = await orderItemRepo.findOne({
          where: { master_id: masterId },
        });

        if (existingItem) {
          results.skipped++;
          continue;
        }

        const newItem = orderItemRepo.create({
          order_id: orderId,
          master_id: masterId,
          ItemID_DE: itemIdDe, // Keeping the reference code
          item_id: actualItem ? actualItem.id : null, // LINKING the foreign key
          qty: qty,
          remark_de: remarkDe,
          qty_delivered: qtyDelivered,
          qty_label: qty,
          status: "NSO",
        });

        await orderItemRepo.save(newItem);
        results.created++;
      } catch (error) {
        results.failed++;
        console.error(`Failed to process order item:`, error);
      }
    }
    return results;
  }

  /**
   * Validate that all required category mappings exist
   */
  private static async validateCategoryMappings(
    categoryRepo: any,
  ): Promise<void> {
    const requiredCategoryIds = Array.from(EtlController.CATEGORY_MAP.values());

    const existingCategories = await categoryRepo.find({
      where: { id: In(requiredCategoryIds) },
    });

    const existingIds = new Set(existingCategories.map((c: any) => c.id));
    const missingIds = requiredCategoryIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw new Error(
        `Missing categories in database: ${missingIds.join(", ")}`,
      );
    }

    console.log("Category mappings validated", {
      total: requiredCategoryIds.length,
      existing: existingCategories.length,
    });
  }
  private static async syncRequiredCategories(
    categoryRepo: any,
  ): Promise<void> {
    for (const mapping of EtlController.CATEGORY_MAPPING) {
      let category = await categoryRepo.findOne({
        where: [
          { id: mapping.databaseCategoryId },
          { de_cat: mapping.name }, // Fallback check
        ],
      });

      if (!category) {
        console.log(`Category ${mapping.name} not found. Creating...`);
        category = categoryRepo.create({
          id: mapping.databaseCategoryId, // Force ID if your DB allows, or let it auto-gen
          de_cat: mapping.name,
          name: mapping.name,
          is_ignored_value: "N",
        });
        await categoryRepo.save(category);
      }
    }
  }

  /**
   * Validate and parse date string
   */
  private static validateDate(
    dateStr: string,
    fieldName: string,
    allowNull = false,
  ): string | null {
    if (!dateStr && allowNull) {
      return null;
    }

    if (!dateStr) {
      throw new Error(`${fieldName} is required`);
    }

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid ${fieldName}: ${dateStr}`);
      }
      return date.toISOString();
    } catch (error) {
      throw new Error(`Invalid ${fieldName}: ${dateStr}`);
    }
  }

  /**
   * Run cleanup tasks
   */
  private static async runCleanupTasks(): Promise<void> {
    try {
      console.log("Starting cleanup tasks");

      await Promise.allSettled([
        EtlController.removeUnmatchedOrders(),
        EtlController.removeUnmatchedItems(),
        EtlController.updateOrderItemQty(),
      ]);

      console.log("Cleanup tasks completed");
    } catch (error) {
      console.error("Cleanup tasks failed", error);
      // Don't throw - cleanup failures shouldn't stop the main process
    }
  }

  /**
   * Remove unmatched orders with error handling
   */
  public static async removeUnmatchedOrders(): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      const orderRepo = queryRunner.manager.getRepository(Order);
      const ordersFilePath = path.join(EtlController.publicPath, "orders.csv");

      const records = await EtlController.readCsv(ordersFilePath);

      // Handle case when CSV is empty or has only header
      const csvOrderNos =
        records.length > 1
          ? records
            .slice(1)
            .map((r) => r[0]?.toString().trim())
            .filter(Boolean)
          : [];

      // Find orders not in CSV and not containing "DENI"
      const existingOrders = await orderRepo.find({
        where: {
          order_no: Not(Like("%DENI%")),
        },
        select: ["order_no"],
      });

      const unmatched = existingOrders
        .filter((o) => !csvOrderNos.includes(o.order_no))
        .map((o) => o.order_no);

      if (unmatched.length > 0) {
        // Delete in batches to avoid locks
        for (let i = 0; i < unmatched.length; i += EtlController.BATCH_SIZE) {
          const batch = unmatched.slice(i, i + EtlController.BATCH_SIZE);
          await orderRepo.delete({ order_no: In(batch) });
          console.log(`Deleted ${batch.length} unmatched orders`);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error removing unmatched orders", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Tries to find a category in the map/database,
   * if not found, it creates it.
   */
  private static async getOrCreateCategory(
    csvId: number,
    categoryRepo: any,
  ): Promise<number> {
    // 1. Check if it's in our hardcoded map
    let dbId = EtlController.CATEGORY_MAP.get(csvId);

    // 2. If it's in the map, double check it actually exists in DB
    if (dbId) {
      const exists = await categoryRepo.findOne({ where: { id: dbId } });
      if (exists) return dbId;
    }

    // 3. If not in map OR not in DB, look for it by name (e.g. "CAT21")
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

    // 4. Cache it in the map so we don't query the DB for this ID again this session
    EtlController.CATEGORY_MAP.set(csvId, category.id);

    return category.id;
  }
  /**
   * Remove unmatched items with error handling
   */
  public static async removeUnmatchedItems(): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      const orderItemRepo = queryRunner.manager.getRepository(OrderItem);
      const orderItemsFilePath = path.join(
        EtlController.publicPath,
        "order_items.csv",
      );

      if (!fs.existsSync(orderItemsFilePath)) {
        console.warn(
          "Order items CSV not found, skipping unmatched items removal",
        );
        return;
      }

      const records = await EtlController.readCsv(orderItemsFilePath);

      // Handle case when CSV is empty or has only header
      const csvMasterIds =
        records.length > 1
          ? records
            .slice(1)
            .map((r) => r[0]?.toString().trim())
            .filter(Boolean)
          : [];

      const existingItems = await orderItemRepo.find({
        where: { master_id: Not(Like("%MIS%")) },
        select: ["master_id"],
      });

      const unmatchedMasterIds = existingItems
        .filter((i) => i.master_id && !csvMasterIds.includes(i.master_id))
        .map((i) => i.master_id as string);

      if (unmatchedMasterIds.length > 0) {
        // Delete in batches
        for (
          let i = 0;
          i < unmatchedMasterIds.length;
          i += EtlController.BATCH_SIZE
        ) {
          const batch = unmatchedMasterIds.slice(
            i,
            i + EtlController.BATCH_SIZE,
          );
          await orderItemRepo.delete({ master_id: In(batch) });
          console.log(`Deleted ${batch.length} unmatched order items`);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error removing unmatched items", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update order item quantities with error handling
   */
  public static async updateOrderItemQty(): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      const orderItemRepo = queryRunner.manager.getRepository(OrderItem);
      const orderItemsFilePath = path.join(
        EtlController.publicPath,
        "order_items.csv",
      );

      if (!fs.existsSync(orderItemsFilePath)) {
        console.warn("Order items CSV not found, skipping quantity updates");
        return;
      }

      const records = await EtlController.readCsv(orderItemsFilePath);

      // Handle case when CSV is empty or has only header
      if (records.length <= 1) {
        console.log("No order items to update");
        return;
      }

      const updates = [];

      for (const row of records.slice(1)) {
        if (!row || row.length < 6) continue;

        const master_id = row[0]?.toString().trim();
        if (!master_id) continue;

        const qty = parseInt(row[3]);
        if (isNaN(qty)) continue;

        const qtyDelivered = parseInt(row[5]);

        updates.push({
          master_id,
          qty,
          remark_de: row[4]?.toString().substring(0, 500) || "",
          qty_delivered: isNaN(qtyDelivered) ? 0 : qtyDelivered,
          qty_label: qty,
        });
      }

      // Update in batches
      for (let i = 0; i < updates.length; i += EtlController.BATCH_SIZE) {
        const batch = updates.slice(i, i + EtlController.BATCH_SIZE);

        await Promise.allSettled(
          batch.map((update) =>
            orderItemRepo.update(
              { master_id: update.master_id },
              {
                qty: update.qty,
                remark_de: update.remark_de,
                qty_delivered: update.qty_delivered,
                qty_label: update.qty_label,
              },
            ),
          ),
        );
      }

      await queryRunner.commitTransaction();
      console.log(`Updated ${updates.length} order items`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error updating order item quantities", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Helper: Read CSV file with error handling
   */
  private static readCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];

      if (!fs.existsSync(filePath)) {
        return resolve([]);
      }

      const parser = parse({
        delimiter: ",",
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true,
      });

      fs.createReadStream(filePath)
        .pipe(parser)
        .on("data", (data: any) => records.push(data))
        .on("end", () => {
          console.log(`CSV loaded: ${path.basename(filePath)}`, {
            rows: records.length,
          });
          resolve(records);
        })
        .on("error", (err: any) => {
          console.error(`Error reading CSV: ${path.basename(filePath)}`, err);
          reject(err);
        });
    });
  }

  // Placeholder methods for backward compatibility
  public static async whareHouseSync(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    res.status(200).json({
      success: true,
      message: "Warehouse sync not implemented",
    });
  }

  public static async synchIDs() {
    console.log("synchIDs called - not implemented");
  }
}
