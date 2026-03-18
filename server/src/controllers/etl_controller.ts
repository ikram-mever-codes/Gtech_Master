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

interface ETLSummary {
  startTime: Date;
  endTime: Date;
  duration: number;
  orders: {
    total: number;
    created: number;
    updated: number;
    failed: number;
  };
  items: {
    total: number;
    created: number;
    updated: number;
    failed: number;
  };
  categories: {
    created: number;
    existing: number;
    failed: number;
  };
  errors: Array<{ type: string; message: string; row?: number; data?: any }>;
}

export class EtlController {
  private static publicPath = path.join(__dirname, "../../public");
  private static readonly BATCH_SIZE = 1000;

  // Category mapping
  private static readonly CATEGORY_MAPPING: {
    [key: number]: { id: number; name: string };
  } = {
    26: { id: 55, name: "STD" },
    18: { id: 56, name: "GBL" },
    13: { id: 57, name: "GTR" },
    21: { id: 58, name: "PRO" },
    20: { id: 59, name: "ERS" },
    8: { id: 60, name: "TBA" },
  };

  // German month mapping
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

  /**
   * Main ETL Entry Point
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
      orders: { total: 0, created: 0, updated: 0, failed: 0 },
      items: { total: 0, created: 0, updated: 0, failed: 0 },
      categories: { created: 0, existing: 0, failed: 0 },
      errors: [],
    };

    try {
      console.log("\n" + "=".repeat(70));
      console.log("🚀 STARTING ETL PROCESS");
      console.log("=".repeat(70));

      const categoryRepo = AppDataSource.getRepository(Category);
      const orderRepo = AppDataSource.getRepository(Order);
      const orderItemRepo = AppDataSource.getRepository(OrderItem);
      const itemRepo = AppDataSource.getRepository(Item);

      // STEP 1: Sync categories
      console.log("\n📁 STEP 1: Syncing categories...");
      await EtlController.syncCategories(categoryRepo, summary);

      // STEP 2: Read and process orders
      console.log("\n📦 STEP 2: Processing orders...");
      const ordersFilePath = path.join(EtlController.publicPath, "orders.csv");
      const orderRows = await EtlController.readCsv(
        ordersFilePath,
        "orders.csv",
      );

      if (orderRows.length <= 1) {
        throw new Error("No orders found in orders.csv");
      }

      const orderData = orderRows.slice(1);
      summary.orders.total = orderData.length;

      // Process all orders
      const orderMap = await EtlController.processOrders(
        orderData,
        orderRepo,
        categoryRepo,
        summary,
      );

      // STEP 3: Read and process order items
      console.log("\n📋 STEP 3: Processing order items...");
      const itemsFilePath = path.join(
        EtlController.publicPath,
        "order_items.csv",
      );
      const itemRows = await EtlController.readCsv(
        itemsFilePath,
        "order_items.csv",
      );

      if (itemRows.length <= 1) {
        throw new Error("No order items found in order_items.csv");
      }

      const itemData = itemRows.slice(1);
      summary.items.total = itemData.length;

      // Process all order items
      await EtlController.processOrderItems(
        itemData,
        orderItemRepo,
        itemRepo,
        orderMap,
        summary,
      );

      // Calculate duration
      summary.endTime = new Date();
      summary.duration =
        summary.endTime.getTime() - summary.startTime.getTime();

      // Print final summary
      EtlController.printSummary(summary);

      res.status(200).json({
        success: true,
        message: "ETL process completed successfully",
        summary,
      });
    } catch (error) {
      console.error("\n❌ ETL Failed:", error);
      summary.errors.push({
        type: "CRITICAL",
        message: error instanceof Error ? error.message : String(error),
        data: error,
      });
      EtlController.printSummary(summary);
      next(error);
    }
  }

  /**
   * Sync categories
   */
  private static async syncCategories(
    categoryRepo: any,
    summary: ETLSummary,
  ): Promise<void> {
    for (const [csvId, mapping] of Object.entries(
      EtlController.CATEGORY_MAPPING,
    )) {
      try {
        let category = await categoryRepo.findOne({
          where: { id: mapping.id },
        });

        if (!category) {
          category = await categoryRepo.findOne({
            where: { de_cat: mapping.name },
          });

          if (category) {
            console.log(
              `   📝 Category ${mapping.name} exists with ID ${category.id}`,
            );
            summary.categories.existing++;
          } else {
            category = categoryRepo.create({
              id: mapping.id,
              de_cat: mapping.name,
              name: mapping.name,
              is_ignored_value: "N",
            });
            await categoryRepo.save(category);
            console.log(
              `   ✅ Created category: ${mapping.name} (ID: ${mapping.id})`,
            );
            summary.categories.created++;
          }
        } else {
          console.log(
            `   📝 Category exists: ${mapping.name} (ID: ${mapping.id})`,
          );
          summary.categories.existing++;
        }
      } catch (error: any) {
        console.error(
          `   ❌ Failed to sync category ${mapping.name}:`,
          error.message,
        );
        summary.categories.failed++;
      }
    }
  }

  /**
   * Process orders with CORRECT column mappings
   */
  /**
   * Process orders with CORRECT column mappings
   */
  private static async processOrders(
    rows: any[],
    orderRepo: any,
    categoryRepo: any,
    summary: ETLSummary,
  ): Promise<Map<string, number>> {
    const orderMap = new Map<string, number>();

    // Get all existing orders
    const allOrderNos = rows
      .map((r) => r[0]?.toString().trim())
      .filter(Boolean);
    const existingOrders = await orderRepo.find({
      where: { order_no: In(allOrderNos) },
      select: ["id", "order_no"],
    });

    // Populate map with existing orders: order_no -> id
    existingOrders.forEach((o: any) => {
      orderMap.set(o.order_no, o.id);
    });

    console.log(`   Found ${orderMap.size} existing orders`);

    // Process orders in batches
    for (let i = 0; i < rows.length; i += EtlController.BATCH_SIZE) {
      const batch = rows.slice(i, i + EtlController.BATCH_SIZE);

      for (const row of batch) {
        try {
          const orderNo = row[0]?.toString().trim(); // supplier_order_no
          if (!orderNo) continue;

          // Parse category (index 1)
          const csvCategoryId = parseInt(row[1]);
          let categoryId = 55; // Default to STD

          if (!isNaN(csvCategoryId)) {
            const mapping = EtlController.CATEGORY_MAPPING[csvCategoryId];
            if (mapping) {
              categoryId = mapping.id;
            }
          }

          // Parse dates (indices 4,5,6)
          const dateCreated =
            EtlController.parseGermanDate(row[4]) || new Date();
          const dateEmailed = EtlController.parseGermanDate(row[5]);
          const dateDelivery =
            EtlController.parseGermanDate(row[6]) || new Date();

          const orderData = {
            order_no: orderNo,
            category_id: categoryId,
            status: parseInt(row[2]) || 0, // order_status at index 2
            comment: row[3]?.toString().substring(0, 255) || "", // order_comment at index 3
            date_created: dateCreated.toISOString(),
            date_emailed: dateEmailed ? dateEmailed.toISOString() : null,
            date_delivery: dateDelivery.toISOString(),
          };

          if (orderMap.has(orderNo)) {
            // Update existing
            await orderRepo.update({ order_no: orderNo }, orderData);
            summary.orders.updated++;
          } else {
            // Create new
            const newOrder = orderRepo.create(orderData);
            const saved = await orderRepo.save(newOrder);
            // FIXED: Set order_no as key, saved.id as value
            orderMap.set(orderNo, saved.id);
            summary.orders.created++;
          }
        } catch (error: any) {
          console.error(`   Error processing order:`, error.message);
          summary.orders.failed++;
        }
      }

      const processed = Math.min(i + EtlController.BATCH_SIZE, rows.length);
      console.log(`   Progress: ${processed}/${rows.length} orders processed`);
    }

    // Verify the map has all orders
    console.log(`\n   📊 Order map verification:`);
    console.log(`      Total orders in map: ${orderMap.size}`);

    // Log first 5 entries for debugging
    const sampleEntries = Array.from(orderMap.entries()).slice(0, 5);
    console.log(`      Sample mappings:`, sampleEntries);

    console.log(
      `\n   📊 Orders: ${summary.orders.created} created, ${summary.orders.updated} updated, ${summary.orders.failed} failed`,
    );

    return orderMap;
  }

  /**
   * Process order items with CORRECT column mappings
   */
  private static async processOrderItems(
    rows: any[],
    orderItemRepo: any,
    itemRepo: any,
    orderMap: Map<string, number>,
    summary: ETLSummary,
  ): Promise<void> {
    // Get all items for lookup
    const allItems = await itemRepo.find({ select: ["id", "ItemID_DE"] });
    const itemLookup = new Map(allItems.map((i: any) => [i.ItemID_DE, i.id]));

    console.log(`\n   📊 Processing ${rows.length} order items...`);

    // Get existing order items
    const allMasterIds = rows
      .map((r) => r[0]?.toString().trim())
      .filter(Boolean);
    const existingItems = await orderItemRepo.find({
      where: { master_id: In(allMasterIds) },
      select: ["master_id"],
    });

    const existingMasterIds = new Set(
      existingItems.map((i: any) => i.master_id),
    );
    console.log(`   Found ${existingMasterIds.size} existing items`);

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    // Process items in batches
    for (let i = 0; i < rows.length; i += EtlController.BATCH_SIZE) {
      const batch = rows.slice(i, i + EtlController.BATCH_SIZE);

      for (const row of batch) {
        try {
          // Validate row
          if (!row || row.length < 7) {
            failed++;
            continue;
          }

          const masterId = row[0]?.toString().trim(); // masterItemID at index 0
          if (!masterId) {
            failed++;
            continue;
          }

          const orderNo = row[1]?.toString().trim(); // order_no at index 1 - THIS IS CORRECT!
          if (!orderNo) {
            failed++;
            continue;
          }

          // Get order ID from map
          const orderId = orderMap.get(orderNo);
          console.log(orderId);
          if (!orderId) {
            console.warn(`   Order ${orderNo} not found for item ${masterId}`);
            failed++;
            continue;
          }

          // Parse ItemID_DE (index 2)
          const itemIdDe = parseInt(row[2]?.toString().trim(), 10);
          if (isNaN(itemIdDe) || itemIdDe <= 0) {
            failed++;
            continue;
          }

          // Parse quantities
          const qty = parseInt(row[3]?.toString().trim(), 10) || 0; // qty at index 3
          const qtyDelivered = parseInt(row[6]?.toString().trim(), 10) || 0; // qty_delivered at index 6
          const remark = row[4]?.toString().trim() || ""; // remark at index 4

          // Get item ID from lookup
          const itemId = itemLookup.get(itemIdDe) || null;

          if (existingMasterIds.has(masterId)) {
            // Update existing
            await orderItemRepo.update(
              { master_id: masterId },
              {
                order_id: orderId,
                ItemID_DE: itemIdDe,
                item_id: itemId,
                qty: qty,
                remark_de: remark,
                qty_delivered: qtyDelivered,
                qty_label: qty,
              },
            );
            updated++;
          } else {
            // Insert new
            await orderItemRepo
              .createQueryBuilder()
              .insert()
              .into(OrderItem)
              .values({
                order_id: orderId,
                master_id: masterId,
                ItemID_DE: itemIdDe,
                item_id: itemId,
                qty: qty,
                remark_de: remark,
                qty_delivered: qtyDelivered,
                qty_label: qty,
                status: "NSO",
              })
              .execute();
            inserted++;
          }
        } catch (error: any) {
          console.error(`   Error processing item:`, error.message);
          failed++;
        }
      }

      const processed = Math.min(i + EtlController.BATCH_SIZE, rows.length);
      console.log(
        `   Progress: ${processed}/${rows.length} items processed (ins: ${inserted}, upd: ${updated}, fail: ${failed})`,
      );
    }

    summary.items.created = inserted;
    summary.items.updated = updated;
    summary.items.failed = failed;

    console.log(
      `\n   📊 Items: ${inserted} created, ${updated} updated, ${failed} failed`,
    );
  }

  /**
   * Parse German date format
   */
  private static parseGermanDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === "") return null;

    try {
      let cleaned = dateStr.trim().replace(/\s+/g, " ");

      for (const [de, num] of Object.entries(EtlController.MONTH_MAP)) {
        cleaned = cleaned.replace(new RegExp(de, "g"), num);
      }

      const date = new Date(cleaned);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  /**
   * Read CSV file
   */
  private static readCsv(filePath: string, filename: string): Promise<any[]> {
    return new Promise((resolve) => {
      const records: any[] = [];

      if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️ File not found: ${filename}`);
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
          console.log(`   📄 Read ${records.length} rows from ${filename}`);
          resolve(records);
        })
        .on("error", (err) => {
          console.error(`   ❌ Error reading ${filename}:`, err.message);
          resolve([]);
        });
    });
  }

  /**
   * Print final summary
   */
  private static printSummary(summary: ETLSummary): void {
    console.log("\n" + "=".repeat(70));
    console.log("📊 FINAL ETL SUMMARY");
    console.log("=".repeat(70));
    console.log(`Duration: ${(summary.duration / 1000).toFixed(2)} seconds`);

    console.log(`\n📁 Categories:`);
    console.log(`   Created: ${summary.categories.created}`);
    console.log(`   Existing: ${summary.categories.existing}`);
    console.log(`   Failed: ${summary.categories.failed}`);

    console.log(`\n📦 Orders:`);
    console.log(`   Total: ${summary.orders.total}`);
    console.log(`   Created: ${summary.orders.created}`);
    console.log(`   Updated: ${summary.orders.updated}`);
    console.log(`   Failed: ${summary.orders.failed}`);

    console.log(`\n📋 Order Items:`);
    console.log(`   Total: ${summary.items.total}`);
    console.log(`   Created: ${summary.items.created}`);
    console.log(`   Updated: ${summary.items.updated}`);
    console.log(`   Failed: ${summary.items.failed}`);

    if (summary.errors.length > 0) {
      console.log(`\n⚠️ Errors (${summary.errors.length}):`);
      summary.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.type}: ${err.message}`);
      });
    }
    console.log("=".repeat(70));
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
