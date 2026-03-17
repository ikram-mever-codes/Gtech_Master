import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { Not, Like, In, IsNull } from "typeorm";
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

interface ETLSummary {
  startTime: Date;
  endTime: Date;
  duration: number;
  orders: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
  };
  items: {
    total: number;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  cleanup: {
    ordersRemoved: number;
    itemsRemoved: number;
    itemsUpdated: number;
  };
  errors: Array<{ type: string; message: string; data?: any }>;
}

export class EtlController {
  private static publicPath = path.join(__dirname, "../../public");
  private static readonly BATCH_SIZE = 100;
  private static readonly UPDATE_BATCH_SIZE = 50;

  // Category mapping configuration
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

  // Default category if mapping not found
  private static readonly DEFAULT_CATEGORY_ID = 55; // STD

  /**
   * Main ETL Entry Point with transaction support
   */
  public static async findTargetDate(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const summary: ETLSummary = {
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      orders: { total: 0, created: 0, updated: 0, skipped: 0 },
      items: { total: 0, inserted: 0, updated: 0, skipped: 0, failed: 0 },
      cleanup: { ordersRemoved: 0, itemsRemoved: 0, itemsUpdated: 0 },
      errors: [],
    };

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log("=".repeat(50));
      console.log("Starting Nexaura ETL Engine...");
      console.log("=".repeat(50));

      const categoryRepo = queryRunner.manager.getRepository(Category);
      const orderRepo = queryRunner.manager.getRepository(Order);
      const orderItemRepo = queryRunner.manager.getRepository(OrderItem);

      // Ensure core categories exist before starting
      await EtlController.syncRequiredCategories(categoryRepo);

      // 1. Process Orders
      console.log("\n📦 Processing Orders...");
      const ordersFilePath = path.join(EtlController.publicPath, "orders.csv");
      const orderRecords = await EtlController.readCsv(ordersFilePath);

      if (orderRecords.length > 1) {
        console.log(`Found ${orderRecords.length - 1} orders in CSV`);

        const orderResult = await EtlController.processOrders(
          orderRecords.slice(1),
          orderRepo,
          categoryRepo,
        );

        summary.orders = orderResult;
        console.log(
          `✅ Orders processed: ${orderResult.created} created, ${orderResult.updated} updated, ${orderResult.skipped} skipped`,
        );
      } else {
        console.log("⚠️ No orders found in CSV");
      }

      // 2. Get order map for item linking
      const orderMap = await EtlController.buildOrderMap(orderRepo);

      // 3. Process Order Items
      console.log("\n📋 Processing Order Items...");
      const orderItemsFilePath = path.join(
        EtlController.publicPath,
        "order_items.csv",
      );

      if (fs.existsSync(orderItemsFilePath)) {
        const itemRecords = await EtlController.readCsv(orderItemsFilePath);

        if (itemRecords.length > 1) {
          console.log(`Found ${itemRecords.length - 1} order items in CSV`);

          const itemResult = await EtlController.processOrderItems(
            itemRecords.slice(1),
            orderItemRepo,
            orderMap,
          );

          summary.items = itemResult;
          console.log(
            `✅ Items processed: ${itemResult.inserted} inserted, ${itemResult.updated} updated, ${itemResult.skipped} skipped, ${itemResult.failed} failed`,
          );
        } else {
          console.log("⚠️ No order items found in CSV");
        }
      } else {
        console.log("⚠️ order_items.csv not found, skipping item processing");
      }

      // 4. Cleanup Tasks
      console.log("\n🧹 Running Cleanup Tasks...");
      const cleanupResult = await EtlController.runCleanupTasks(
        orderRepo,
        orderItemRepo,
      );
      summary.cleanup = cleanupResult;
      console.log(
        `✅ Cleanup complete: ${cleanupResult.ordersRemoved} orders removed, ${cleanupResult.itemsRemoved} items removed, ${cleanupResult.itemsUpdated} items updated`,
      );

      // Commit transaction
      await queryRunner.commitTransaction();

      // Calculate duration
      summary.endTime = new Date();
      summary.duration =
        summary.endTime.getTime() - summary.startTime.getTime();

      // Log final summary
      console.log("\n" + "=".repeat(50));
      console.log("📊 ETL PROCESSING SUMMARY");
      console.log("=".repeat(50));
      console.log(`Duration: ${(summary.duration / 1000).toFixed(2)} seconds`);
      console.log(
        `Orders: ${summary.orders.created} created, ${summary.orders.updated} updated`,
      );
      console.log(
        `Items: ${summary.items.inserted} inserted, ${summary.items.updated} updated`,
      );
      console.log(
        `Cleanup: ${summary.cleanup.ordersRemoved} orders removed, ${summary.cleanup.itemsRemoved} items removed`,
      );
      if (summary.errors.length > 0) {
        console.log(`\n⚠️ Errors: ${summary.errors.length}`);
        summary.errors.slice(0, 5).forEach((err) => {
          console.log(`  - ${err.type}: ${err.message}`);
        });
      }
      console.log("=".repeat(50));

      res.status(200).json({
        success: true,
        message: "ETL process completed successfully",
        summary,
      });
    } catch (error) {
      console.error("❌ ETL Critical Failure:", error);
      await queryRunner.rollbackTransaction();
      summary.errors.push({
        type: "CRITICAL_ERROR",
        message: error instanceof Error ? error.message : String(error),
        data: error,
      });
      next(error);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Process orders with upsert logic
   */
  private static async processOrders(
    rows: any[],
    orderRepo: any,
    categoryRepo: any,
  ): Promise<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
  }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Get existing orders
    const csvOrderNos = rows
      .map((r) => r[0]?.toString().trim())
      .filter(Boolean);

    const existingOrders = await orderRepo.find({
      where: { order_no: In(csvOrderNos) },
      select: [
        "id",
        "order_no",
        "category_id",
        "status",
        "comment",
        "date_created",
        "date_emailed",
        "date_delivery",
      ],
    });

    const existingOrderMap = new Map(
      existingOrders.map((o: any) => [o.order_no, o]),
    );

    // Process in batches
    for (let i = 0; i < rows.length; i += EtlController.BATCH_SIZE) {
      const batch = rows.slice(i, i + EtlController.BATCH_SIZE);
      const savePromises = [];

      for (const row of batch) {
        try {
          const orderNo = row[0]?.toString().trim();
          if (!orderNo) {
            skipped++;
            continue;
          }

          const csvCategoryId = parseInt(row[1]);
          if (isNaN(csvCategoryId)) {
            console.warn(
              `Invalid category ID for order ${orderNo}, using default`,
            );
            skipped++;
            continue;
          }

          const dbCategoryId = await EtlController.getOrCreateCategory(
            csvCategoryId,
            categoryRepo,
          );

          const orderData = {
            order_no: orderNo,
            category_id: dbCategoryId,
            status: parseInt(row[2]) || 0,
            comment: row[3]?.toString().substring(0, 255) || "",
            date_created: EtlController.validateDate(row[4], "date_created"),
            date_emailed: EtlController.validateDate(
              row[5],
              "date_emailed",
              true,
            ),
            date_delivery: EtlController.validateDate(row[6], "date_delivery"),
          };

          const existingOrder = existingOrderMap.get(orderNo);

          if (existingOrder) {
            // Update if changed
            if (EtlController.hasOrderChanged(existingOrder, orderData)) {
              savePromises.push(
                orderRepo.update({ order_no: orderNo }, orderData).then(() => {
                  updated++;
                }),
              );
            } else {
              skipped++;
            }
          } else {
            // Create new
            savePromises.push(
              orderRepo.save(orderData).then(() => {
                created++;
              }),
            );
          }
        } catch (error) {
          console.error(`Error processing order:`, error);
          skipped++;
        }
      }

      await Promise.allSettled(savePromises);

      if ((i + batch.length) % 100 === 0) {
        console.log(
          `Progress: ${i + batch.length}/${rows.length} orders processed`,
        );
      }
    }

    return { total: rows.length, created, updated, skipped };
  }

  /**
   * Check if order has changed
   */
  private static hasOrderChanged(existing: any, newData: any): boolean {
    return (
      existing.category_id !== newData.category_id ||
      existing.status !== newData.status ||
      existing.comment !== newData.comment ||
      existing.date_created !== newData.date_created ||
      existing.date_emailed !== newData.date_emailed ||
      existing.date_delivery !== newData.date_delivery
    );
  }

  /**
   * Build order map for item linking
   */
  private static async buildOrderMap(
    orderRepo: any,
  ): Promise<Map<string, number>> {
    const orders = await orderRepo.find({
      select: ["id", "order_no"],
    });

    return new Map(orders.map((o: any) => [o.order_no, o.id]));
  }

  /**
   * Process order items with full error handling and missing order creation
   */
  private static async processOrderItems(
    rows: any[],
    orderItemRepo: any,
    orderMap: Map<string, number>,
  ): Promise<{
    total: number;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
  }> {
    const itemRepo = AppDataSource.getRepository(Item);
    const orderRepo = AppDataSource.getRepository(Order);
    const categoryRepo = AppDataSource.getRepository(Category);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    // First, identify and create missing orders
    const missingOrders = await EtlController.ensureOrdersExist(
      rows,
      orderMap,
      orderRepo,
      categoryRepo,
    );

    if (missingOrders.length > 0) {
      console.log(
        `Created ${missingOrders.length} missing orders from order items`,
      );
    }

    // Validate and collect valid rows
    const { validRows, itemIds } = await EtlController.validateOrderItemRows(
      rows,
      orderMap,
    );

    if (validRows.length === 0) {
      console.log("No valid order items to process");
      return {
        total: rows.length,
        inserted: 0,
        updated: 0,
        skipped: rows.length,
        failed: 0,
      };
    }

    // Get item lookup map
    const itemLookup = await EtlController.getItemLookup(itemIds);

    // Get existing order items
    const masterIds = validRows.map((r) => r.masterId);
    const existingItems = await orderItemRepo.find({
      where: { master_id: In(masterIds) },
      select: ["master_id", "id"],
    });

    const existingMasterIds = new Set(
      existingItems.map((i: any) => i.master_id),
    );

    // Prepare batches
    const toInsert: any[] = [];
    const toUpdate: any[] = [];

    for (const row of validRows) {
      const orderItemData = {
        order_id: row.orderId,
        master_id: row.masterId,
        ItemID_DE: row.itemIdDe,
        item_id: itemLookup.get(row.itemIdDe) || null,
        qty: row.qty,
        remark_de: row.remark,
        qty_delivered: row.qtyDelivered,
        qty_label: row.qty,
        status: "NSO",
      };

      if (existingMasterIds.has(row.masterId)) {
        toUpdate.push(orderItemData);
      } else {
        toInsert.push(orderItemData);
      }
    }

    // Insert new records in batches
    if (toInsert.length > 0) {
      const insertResult = await EtlController.insertOrderItemsBatched(
        toInsert,
        orderItemRepo,
      );
      inserted = insertResult.success;
      failed += insertResult.failed;
    }

    // Update existing records in batches
    if (toUpdate.length > 0) {
      const updateResult = await EtlController.updateOrderItemsBatched(
        toUpdate,
        orderItemRepo,
      );
      updated = updateResult.success;
      failed += updateResult.failed;
    }

    skipped = rows.length - (inserted + updated + failed);

    return {
      total: rows.length,
      inserted,
      updated,
      skipped,
      failed,
    };
  }

  /**
   * Validate order item rows
   */
  private static async validateOrderItemRows(
    rows: any[],
    orderMap: Map<string, number>,
  ): Promise<{
    validRows: Array<{
      masterId: string;
      orderId: number;
      itemIdDe: number;
      qty: number;
      qtyDelivered: number;
      remark: string;
    }>;
    itemIds: number[];
  }> {
    const validRows = [];
    const itemIds = [];

    for (const row of rows) {
      try {
        if (!row || row.length < 7) {
          continue;
        }

        const masterId = row[0]?.toString().trim();
        if (!masterId) continue;

        const orderNo = row[1]?.toString().trim();
        if (!orderNo) continue;

        const orderId = orderMap.get(orderNo);
        if (!orderId) continue;

        const itemIdDeStr = row[2]?.toString().trim();
        if (!itemIdDeStr) continue;

        const itemIdDe = parseInt(itemIdDeStr, 10);
        if (isNaN(itemIdDe) || itemIdDe <= 0) continue;

        const qty = parseInt(row[3]?.toString().trim(), 10) || 0;
        const qtyDelivered = parseInt(row[6]?.toString().trim(), 10) || 0;
        const remark = row[4]?.toString().trim() || "";

        validRows.push({
          masterId,
          orderId,
          itemIdDe,
          qty,
          qtyDelivered,
          remark,
        });

        itemIds.push(itemIdDe);
      } catch (error) {
        console.warn("Error validating row:", error);
      }
    }

    return { validRows, itemIds };
  }

  /**
   * Get item lookup map
   */
  private static async getItemLookup(
    itemIds: number[],
  ): Promise<Map<number, number>> {
    if (itemIds.length === 0) return new Map();

    const uniqueIds = [...new Set(itemIds)];
    const itemRepo = AppDataSource.getRepository(Item);

    const items = await itemRepo.find({
      where: { ItemID_DE: In(uniqueIds) },
      select: ["id", "ItemID_DE"],
    });

    return new Map(items.map((i: any) => [i.ItemID_DE, i.id]));
  }

  /**
   * Insert order items in batches with fallback
   */
  private static async insertOrderItemsBatched(
    items: any[],
    orderItemRepo: any,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i += EtlController.BATCH_SIZE) {
      const batch = items.slice(i, i + EtlController.BATCH_SIZE);

      try {
        await orderItemRepo
          .createQueryBuilder()
          .insert()
          .into(OrderItem)
          .values(batch)
          .execute();
        success += batch.length;
      } catch (error) {
        console.error("Batch insert failed, trying individual inserts:", error);

        // Fallback to individual inserts
        for (const item of batch) {
          try {
            await orderItemRepo
              .createQueryBuilder()
              .insert()
              .into(OrderItem)
              .values(item)
              .execute();
            success++;
          } catch (individualError) {
            console.error(
              `Failed to insert item ${item.master_id}:`,
              individualError,
            );
            failed++;
          }
        }
      }

      if ((i + batch.length) % 200 === 0) {
        console.log(`Inserted ${i + batch.length}/${items.length} items`);
      }
    }

    return { success, failed };
  }

  /**
   * Update order items in batches
   */
  private static async updateOrderItemsBatched(
    items: any[],
    orderItemRepo: any,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i += EtlController.UPDATE_BATCH_SIZE) {
      const batch = items.slice(i, i + EtlController.UPDATE_BATCH_SIZE);
      const updatePromises = [];

      for (const item of batch) {
        updatePromises.push(
          orderItemRepo
            .update(
              { master_id: item.master_id },
              {
                qty: item.qty,
                remark_de: item.remark_de,
                qty_delivered: item.qty_delivered,
                qty_label: item.qty_label,
                item_id: item.item_id,
              },
            )
            .then(() => success++)
            .catch((err: any) => {
              console.error(`Failed to update ${item.master_id}:`, err.message);
              failed++;
            }),
        );
      }

      await Promise.allSettled(updatePromises);

      if ((i + batch.length) % 200 === 0) {
        console.log(`Updated ${i + batch.length}/${items.length} items`);
      }
    }

    return { success, failed };
  }

  /**
   * Ensure all orders exist for items
   */
  private static async ensureOrdersExist(
    rows: any[],
    orderMap: Map<string, number>,
    orderRepo: any,
    categoryRepo: any,
  ): Promise<string[]> {
    const orderNosFromItems = new Set(
      rows.map((row) => row[1]?.toString().trim()).filter(Boolean),
    );

    const missingOrders = Array.from(orderNosFromItems).filter(
      (orderNo) => !orderMap.has(orderNo),
    );

    if (missingOrders.length === 0) return [];

    const createdOrders = [];

    for (const orderNo of missingOrders) {
      try {
        const newOrder = orderRepo.create({
          order_no: orderNo,
          category_id: EtlController.DEFAULT_CATEGORY_ID,
          status: 20,
          comment: "Auto-created from order_items.csv import",
          date_created: new Date().toISOString(),
          date_delivery: new Date().toISOString(),
        });

        const saved = await orderRepo.save(newOrder);
        orderMap.set(orderNo, saved.id);
        createdOrders.push(orderNo);
      } catch (error) {
        console.error(`Failed to create missing order ${orderNo}:`, error);
      }
    }

    return createdOrders;
  }

  /**
   * Get or create category by CSV ID
   */
  private static async getOrCreateCategory(
    csvId: number,
    categoryRepo: any,
  ): Promise<number> {
    // Check mapped categories first
    let dbId = EtlController.CATEGORY_MAP.get(csvId);
    if (dbId) {
      const exists = await categoryRepo.findOne({
        where: { id: dbId },
        select: ["id"],
      });
      if (exists) return dbId;
    }

    // Try to find by de_cat
    const deCat = `C${csvId}`.substring(0, 5);
    let category = await categoryRepo.findOne({ where: { de_cat: deCat } });

    if (!category) {
      // Create new category
      category = await categoryRepo.save(
        categoryRepo.create({
          de_cat: deCat,
          name: `Imported Category ${csvId}`,
          is_ignored_value: "N",
        }),
      );
    }

    // Update map for future use
    EtlController.CATEGORY_MAP.set(csvId, category.id);
    return category.id;
  }

  /**
   * Sync required categories from mapping
   */
  private static async syncRequiredCategories(
    categoryRepo: any,
  ): Promise<void> {
    for (const mapping of EtlController.CATEGORY_MAPPING) {
      const exists = await categoryRepo.findOne({
        where: [{ id: mapping.databaseCategoryId }, { de_cat: mapping.name }],
      });

      if (!exists) {
        await categoryRepo.save(
          categoryRepo.create({
            id: mapping.databaseCategoryId,
            de_cat: mapping.name,
            name: mapping.name,
            is_ignored_value: "N",
          }),
        );
        console.log(
          `Created category: ${mapping.name} (ID: ${mapping.databaseCategoryId})`,
        );
      }
    }
  }

  /**
   * Validate and parse date
   */
  private static validateDate(
    dateStr: string,
    field: string,
    allowNull = false,
  ): string | null {
    if (!dateStr || dateStr.trim() === "") {
      return allowNull ? null : new Date().toISOString();
    }

    try {
      // Handle German date format (e.g., "Mär 16 2026  3:22PM")
      const cleaned = dateStr.trim().replace(/\s+/g, " ");
      const d = new Date(cleaned);

      if (isNaN(d.getTime())) {
        console.warn(
          `Invalid date for ${field}: "${dateStr}", using current date`,
        );
        return allowNull ? null : new Date().toISOString();
      }

      return d.toISOString();
    } catch (e) {
      console.warn(`Error parsing date for ${field}: "${dateStr}"`, e);
      return allowNull ? null : new Date().toISOString();
    }
  }

  /**
   * Run cleanup tasks
   */
  private static async runCleanupTasks(
    orderRepo: any,
    orderItemRepo: any,
  ): Promise<{
    ordersRemoved: number;
    itemsRemoved: number;
    itemsUpdated: number;
  }> {
    const [ordersRemoved, itemsRemoved, itemsUpdated] = await Promise.all([
      EtlController.removeUnmatchedOrders(orderRepo),
      EtlController.removeUnmatchedItems(orderItemRepo),
      EtlController.syncItemQuantities(orderItemRepo),
    ]);

    return { ordersRemoved, itemsRemoved, itemsUpdated };
  }

  /**
   * Remove orders not in CSV
   */
  public static async removeUnmatchedOrders(orderRepo: any): Promise<number> {
    try {
      const records = await EtlController.readCsv(
        path.join(EtlController.publicPath, "orders.csv"),
      );

      if (records.length < 2) return 0;

      const csvOrderNos = records
        .slice(1)
        .map((r) => r[0]?.toString().trim())
        .filter(Boolean);

      // Don't delete orders with certain patterns
      const existingOrders = await orderRepo.find({
        where: {
          order_no: Not(Like("%DENI%")),
        },
        select: ["order_no"],
      });

      const unmatched = existingOrders
        .filter((o: any) => !csvOrderNos.includes(o.order_no))
        .map((o: any) => o.order_no);

      if (unmatched.length > 0) {
        await orderRepo.delete({ order_no: In(unmatched) });
        console.log(`Removed ${unmatched.length} unmatched orders`);
      }

      return unmatched.length;
    } catch (error) {
      console.error("Error removing unmatched orders:", error);
      return 0;
    }
  }

  /**
   * Remove order items not in CSV
   */
  public static async removeUnmatchedItems(
    orderItemRepo: any,
  ): Promise<number> {
    try {
      const records = await EtlController.readCsv(
        path.join(EtlController.publicPath, "order_items.csv"),
      );

      if (records.length < 2) return 0;

      const csvMasterIds = records
        .slice(1)
        .map((r) => r[0]?.toString().trim())
        .filter(Boolean);

      const existingItems = await orderItemRepo.find({
        where: {
          master_id: Not(Like("%MIS%")),
        },
        select: ["master_id"],
      });

      const unmatched = existingItems
        .filter((i: any) => i.master_id && !csvMasterIds.includes(i.master_id))
        .map((i: any) => i.master_id);

      if (unmatched.length > 0) {
        await orderItemRepo.delete({ master_id: In(unmatched) });
        console.log(`Removed ${unmatched.length} unmatched order items`);
      }

      return unmatched.length;
    } catch (error) {
      console.error("Error removing unmatched items:", error);
      return 0;
    }
  }

  /**
   * Sync item quantities from CSV
   */
  public static async syncItemQuantities(orderItemRepo: any): Promise<number> {
    try {
      const records = await EtlController.readCsv(
        path.join(EtlController.publicPath, "order_items.csv"),
      );

      if (records.length < 2) return 0;

      let updated = 0;
      const batchSize = 100;
      const updates = [];

      for (const row of records.slice(1)) {
        const masterId = row[0]?.toString().trim();
        if (!masterId) continue;

        const qty = parseInt(row[3]) || 0;
        const qtyDelivered = parseInt(row[6]) || 0;

        updates.push({
          master_id: masterId,
          data: {
            qty: qty,
            remark_de: row[4]?.toString().trim() || "",
            qty_delivered: qtyDelivered,
            qty_label: qty,
          },
        });

        if (updates.length >= batchSize) {
          await EtlController.processUpdateBatch(updates, orderItemRepo);
          updated += updates.length;
          updates.length = 0;
        }
      }

      if (updates.length > 0) {
        await EtlController.processUpdateBatch(updates, orderItemRepo);
        updated += updates.length;
      }

      console.log(`Synced quantities for ${updated} order items`);
      return updated;
    } catch (error) {
      console.error("Error syncing item quantities:", error);
      return 0;
    }
  }

  /**
   * Process update batch
   */
  private static async processUpdateBatch(
    updates: any[],
    orderItemRepo: any,
  ): Promise<void> {
    const promises = updates.map((update) =>
      orderItemRepo
        .update({ master_id: update.master_id }, update.data)
        .catch((err: any) => {
          console.error(`Failed to update ${update.master_id}:`, err.message);
        }),
    );

    await Promise.allSettled(promises);
  }

  /**
   * Read CSV file with error handling
   */
  private static readCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve) => {
      const records: any[] = [];

      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return resolve([]);
      }

      fs.createReadStream(filePath)
        .pipe(
          parse({
            delimiter: ",",
            relax_column_count: true,
            skip_empty_lines: true,
            trim: true,
            skip_records_with_error: true,
          }),
        )
        .on("data", (data) => records.push(data))
        .on("end", () => {
          console.log(
            `Read ${records.length} rows from ${path.basename(filePath)}`,
          );
          resolve(records);
        })
        .on("error", (err) => {
          console.error(`Error reading CSV ${filePath}:`, err);
          resolve([]);
        });
    });
  }

  /**
   * Placeholder Methods
   */
  public static async whareHouseSync(req: Request, res: Response) {
    res.status(200).json({
      success: true,
      message: "Warehouse sync completed (placeholder)",
    });
  }

  public static async synchIDs() {
    console.log("ID Synchronization cycle started.");
  }
}
