import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { Not, Like, In } from "typeorm";
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

  /**
   * Main ETL Entry Point
   */
  public static async findTargetDate(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      console.log("Starting Nexaura ETL Engine...");

      const categoryRepo = AppDataSource.getRepository(Category);
      const orderRepo = AppDataSource.getRepository(Order);
      const orderItemRepo = AppDataSource.getRepository(OrderItem);

      // Ensure core categories exist before starting
      await EtlController.syncRequiredCategories(categoryRepo);

      // 1. Process Orders
      const ordersFilePath = path.join(EtlController.publicPath, "orders.csv");
      const orderRecords = await EtlController.readCsv(ordersFilePath);

      // Optimization: Get a map of Order Number -> Database ID
      const orderMap = await EtlController.processOrdersSequentially(
        orderRecords.slice(1),
        orderRepo,
        categoryRepo,
      );

      // 2. Process Items
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

      // 3. Cleanup
      await EtlController.runCleanupTasks();

      res
        .status(200)
        .json({ success: true, message: "ETL process completed successfully" });
    } catch (error) {
      console.error("ETL Critical Failure:", error);
      next(error);
    }
  }

  /**
   * Processes orders and returns a map for item linking
   */
  private static async processOrdersSequentially(
    rows: any[],
    orderRepo: any,
    categoryRepo: any,
  ): Promise<Map<string, number>> {
    const orderMap = new Map<string, number>();

    // Bulk lookup existing orders to minimize queries
    const csvOrderNos = rows
      .map((r) => r[0]?.toString().trim())
      .filter(Boolean);
    const existingInDb = await orderRepo.find({
      where: { order_no: In(csvOrderNos) },
      select: ["id", "order_no"],
    });

    existingInDb.forEach((o: any) => orderMap.set(o.order_no, o.id));

    for (const row of rows) {
      const orderNo = row[0]?.toString().trim();
      if (!orderNo || orderMap.has(orderNo)) continue;

      try {
        const csvCategoryId = parseInt(row[1]);
        if (isNaN(csvCategoryId)) continue;

        const dbCategoryId = await EtlController.getOrCreateCategory(
          csvCategoryId,
          categoryRepo,
        );

        const newOrder = orderRepo.create({
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
        });

        const savedOrder = await orderRepo.save(newOrder);
        orderMap.set(orderNo, savedOrder.id);
      } catch (e) {
        console.error(`Skipping order ${orderNo} due to error:`, e);
      }
    }
    return orderMap;
  }

  /**
   * Processes order items in batches for performance
   */
  private static async processOrderItemBatch(
    rows: any[],
    orderItemRepo: any,
    orderMap: Map<string, number>,
  ) {
    const itemRepo = AppDataSource.getRepository(Item);

    // Bulk data fetch
    const itemIdDes = [
      ...new Set(rows.map((r) => parseInt(r[1])).filter((id) => !isNaN(id))),
    ];
    const masterIds = rows.map((r) => r[0]?.toString().trim()).filter(Boolean);

    const [actualItems, existingOrderItems] = await Promise.all([
      itemRepo.findBy({ ItemID_DE: In(itemIdDes) }),
      orderItemRepo.find({
        where: { master_id: In(masterIds) },
        select: ["master_id"],
      }),
    ]);

    const itemLookup = new Map(
      actualItems.map((i: any) => [i.ItemID_DE, i.id]),
    );
    const existingMasterIds = new Set(
      existingOrderItems.map((i: any) => i.master_id),
    );

    const toSave = [];

    for (const row of rows) {
      const masterId = row[0]?.toString().trim();
      const itemIdDe = parseInt(row[1]);
      const orderNo = row[2]?.toString().trim();

      if (!masterId || existingMasterIds.has(masterId)) continue;

      const orderId = orderMap.get(orderNo);
      if (!orderId) continue;

      toSave.push(
        orderItemRepo.create({
          order_id: orderId,
          master_id: masterId,
          ItemID_DE: itemIdDe,
          item_id: itemLookup.get(itemIdDe) || null,
          qty: parseInt(row[3]) || 0,
          remark_de: row[4]?.toString().trim() || "",
          qty_delivered: parseInt(row[5]) || 0,
          qty_label: parseInt(row[3]) || 0,
          status: "NSO",
        }),
      );

      if (toSave.length >= EtlController.BATCH_SIZE) {
        await orderItemRepo.save(toSave);
        toSave.length = 0;
      }
    }
    if (toSave.length > 0) await orderItemRepo.save(toSave);
  }

  private static async getOrCreateCategory(
    csvId: number,
    categoryRepo: any,
  ): Promise<number> {
    let dbId = EtlController.CATEGORY_MAP.get(csvId);
    if (dbId) {
      const exists = await categoryRepo.findOne({
        where: { id: dbId },
        select: ["id"],
      });
      if (exists) return dbId;
    }

    const deCat = `C${csvId}`.substring(0, 5);
    let category = await categoryRepo.findOne({ where: { de_cat: deCat } });

    if (!category) {
      category = await categoryRepo.save(
        categoryRepo.create({
          de_cat: deCat,
          name: `Imported ${csvId}`,
          is_ignored_value: "N",
        }),
      );
    }

    EtlController.CATEGORY_MAP.set(csvId, category.id);
    return category.id;
  }

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
      }
    }
  }

  private static validateDate(
    dateStr: string,
    field: string,
    allowNull = false,
  ): string | null {
    if (!dateStr) return allowNull ? null : new Date().toISOString();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  /**
   * Cleanup Methods
   */
  private static async runCleanupTasks(): Promise<void> {
    console.log("Starting cleanup tasks...");
    await Promise.allSettled([
      EtlController.removeUnmatchedOrders(),
      EtlController.removeUnmatchedItems(),
      EtlController.updateOrderItemQty(),
    ]);
  }

  public static async removeUnmatchedOrders(): Promise<void> {
    const orderRepo = AppDataSource.getRepository(Order);
    const records = await EtlController.readCsv(
      path.join(EtlController.publicPath, "orders.csv"),
    );
    const csvOrderNos = records
      .slice(1)
      .map((r) => r[0]?.toString().trim())
      .filter(Boolean);

    const existingOrders = await orderRepo.find({
      where: { order_no: Not(Like("%DENI%")) },
      select: ["order_no"],
    });

    const unmatched = existingOrders
      .filter((o) => !csvOrderNos.includes(o.order_no))
      .map((o) => o.order_no);
    if (unmatched.length > 0) {
      await orderRepo.delete({ order_no: In(unmatched) });
    }
  }

  public static async removeUnmatchedItems(): Promise<void> {
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const records = await EtlController.readCsv(
      path.join(EtlController.publicPath, "order_items.csv"),
    );
    const csvMasterIds = records
      .slice(1)
      .map((r) => r[0]?.toString().trim())
      .filter(Boolean);

    const existingItems = await orderItemRepo.find({
      where: { master_id: Not(Like("%MIS%")) },
      select: ["master_id"],
    });

    const unmatched = existingItems
      .filter((i) => i.master_id && !csvMasterIds.includes(i.master_id))
      .map((i) => i.master_id as string);
    if (unmatched.length > 0) {
      await orderItemRepo.delete({ master_id: In(unmatched) });
    }
  }

  public static async updateOrderItemQty(): Promise<void> {
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const records = await EtlController.readCsv(
      path.join(EtlController.publicPath, "order_items.csv"),
    );

    for (const row of records.slice(1)) {
      const master_id = row[0]?.toString().trim();
      if (!master_id) continue;

      await orderItemRepo.update(
        { master_id },
        {
          qty: parseInt(row[3]) || 0,
          remark_de: row[4]?.toString() || "",
          qty_delivered: parseInt(row[5]) || 0,
          qty_label: parseInt(row[3]) || 0,
        },
      );
    }
  }

  private static readCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve) => {
      const records: any[] = [];
      if (!fs.existsSync(filePath)) return resolve([]);
      fs.createReadStream(filePath)
        .pipe(
          parse({
            delimiter: ",",
            relax_column_count: true,
            skip_empty_lines: true,
            trim: true,
          }),
        )
        .on("data", (data) => records.push(data))
        .on("end", () => resolve(records))
        .on("error", () => resolve([]));
    });
  }

  /**
   * Placeholder Methods
   */
  public static async whareHouseSync(req: Request, res: Response) {
    res
      .status(200)
      .json({
        success: true,
        message: "Warehouse sync completed (placeholder)",
      });
  }

  public static async synchIDs() {
    console.log("ID Synchronization cycle started.");
  }
}
