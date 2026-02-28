import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
// Assuming these entities exist based on your Laravel code
// import { Warehouse } from "../entities/warehouse";
// import { OrderStatus } from "../entities/order_status";

import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { Not, Like, In } from "typeorm";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { Item } from "../models/items";

export class EtlController {
  private static publicPath = path.join(__dirname, "../../public"); /**
   * Helper to format dates and handle German month names
   */
  private static convertToSqlDateFormat(dateStr: string): string | null {
    const monthNames: { [key: string]: string } = {
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

    const regex = /(\w+|\p{L}+)\s+(\d{1,2})\s+(\d{4})/u;
    const matches = dateStr.match(regex);

    if (matches && matches.length === 4) {
      const month = monthNames[matches[1]];
      const day = matches[2].padStart(2, "0");
      const year = matches[3];
      return `${year}-${month}-${day}`;
    }

    return null;
  }

  /**
   * findTargetDate - Synchronizes Orders and Order Items from CSV
   */
  public static async findTargetDate(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const orderRepo = AppDataSource.getRepository(Order);
      const orderItemRepo: any = AppDataSource.getRepository(OrderItem);

      const ordersFilePath = path.join(EtlController.publicPath, "orders.csv");
      const targetDate = new Date().toISOString().split("T")[0];
      const foundOrders: any[] = [];

      // 1. Process orders.csv
      const orderRecords = await EtlController.readCsv(ordersFilePath);
      for (const row of orderRecords.slice(1)) {
        // skip header
        // Assuming date_created is at index 4 (from your PHP code)
        const dateCreated = new Date(row[4]).toISOString().split("T")[0];

        if (dateCreated === targetDate) {
          const newOrder = orderRepo.create({
            order_no: row[0],
            category_id: parseInt(row[1]),
            status: parseInt(row[2]),
            comment: row[3],
            date_created: row[4],
            date_emailed: row[5],
            date_delivery: row[6],
          });
          await orderRepo.save(newOrder);
          foundOrders.push(row);
        }
      }

      // 2. Process order_items.csv
      const orderItemsFilePath = path.join(
        EtlController.publicPath,
        "order_items.csv",
      );
      const itemRecords = await EtlController.readCsv(orderItemsFilePath);

      for (const itemRow of itemRecords.slice(1)) {
        const orderNo = itemRow[2];
        const matchingOrder = foundOrders.find((o) => o[0] === orderNo);

        if (matchingOrder) {
          const newItem = orderItemRepo.create({
            order_no: orderNo,
            master_id: itemRow[0],
            ItemID_DE: parseInt(itemRow[1]),
            qty: parseInt(itemRow[3]),
            remark_de: itemRow[4],
            qty_delivered: parseInt(itemRow[5]),
          });
          await orderItemRepo.save(newItem);
        }
      }

      // 3. Trigger status remark logic
      await EtlController.statusRemarkLogic();

      res
        .status(200)
        .json({ success: true, message: "Orders and items synchronized." });
    } catch (error) {
      next(error);
    }
  }

  /**
   * statusRemark - Internal logic for updating remarks and cleaning up
   */
  private static async statusRemarkLogic() {
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    // Note: Since I don't have your OrderStatus entity,
    // I'm focusing on the cleanup calls you had in the PHP version

    await EtlController.removeUnmatchedOrders();
    await EtlController.removeUnmatchedItems();
    await EtlController.updateOrderItemQty();
  }

  /**
   * removeUnmatchedOrders
   */
  public static async removeUnmatchedOrders() {
    const orderRepo = AppDataSource.getRepository(Order);
    const ordersFilePath = path.join(EtlController.publicPath, "orders.csv");

    const records = await EtlController.readCsv(ordersFilePath);
    const csvOrderNos = records.slice(1).map((r) => r[0]);

    // Find orders not in CSV and not containing "DENI"
    const existingOrders = await orderRepo.find({
      where: { order_no: Not(Like("%DENI%")) },
    });

    const unmatched = existingOrders
      .filter((o) => !csvOrderNos.includes(o.order_no))
      .map((o) => o.order_no);

    if (unmatched.length > 0) {
      await orderRepo.delete({ order_no: In(unmatched) });
    }
  }

  /**
   * removeUnmatchedItems
   */
  public static async removeUnmatchedItems() {
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const orderItemsFilePath = path.join(
      EtlController.publicPath,
      "order_items.csv",
    );

    const records = await EtlController.readCsv(orderItemsFilePath);
    const csvMasterIds = records.slice(1).map((r) => r[0]);

    const existingItems = await orderItemRepo.find({
      where: { master_id: Not(Like("%MIS%")) },
    });

    const unmatchedMasterIds = existingItems
      .filter((i) => i.master_id && !csvMasterIds.includes(i.master_id))
      .map((i) => i.master_id as string);

    if (unmatchedMasterIds.length > 0) {
      await orderItemRepo.delete({ master_id: In(unmatchedMasterIds) });
      // Also delete from OrderStatus if applicable
    }
  }

  /**
   * updateOrderItemQty
   */
  public static async updateOrderItemQty() {
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const orderItemsFilePath = path.join(
      EtlController.publicPath,
      "order_items.csv",
    );

    const records = await EtlController.readCsv(orderItemsFilePath);
    for (const row of records.slice(1)) {
      const master_id = row[0];
      const qty = parseInt(row[3]);
      const remark_de = row[4];
      const qty_delivered = parseInt(row[5]);

      await orderItemRepo.update(
        { master_id: master_id },
        {
          qty,
          remark_de,
          qty_delivered,
          qty_label: qty, // as per your PHP logic
        },
      );
    }
  }

  /**
   * Helper: Read CSV file to array
   */
  private static readCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      if (!fs.existsSync(filePath)) return resolve([]);

      fs.createReadStream(filePath)
        .pipe(parse({ delimiter: ",", relax_column_count: true }))
        .on("data", (data) => records.push(data))
        .on("end", () => resolve(records))
        .on("error", (err) => reject(err));
    });
  }

  // Add these inside the EtlController class in EtlController.ts

  /**
   * synchIDs - Logic to update EAN/ItemID across multiple tables
   */
  public static async synchIDs() {
    // const itemRepo = AppDataSource.getRepository(Item);
    // const orderItemRepo = AppDataSource.getRepository(OrderItem);
    // // const warehouseRepo = AppDataSource.getRepository(Warehouse);
    // const filePath = path.join(EtlController.publicPath, "ItemIDs.csv");
    // const records = await EtlController.readCsv(filePath);
    // const csvData: Record<string, string> = {};
    // records.slice(1).forEach((row) => {
    //   csvData[row[1]] = row[0]; // EAN -> ItemID_DE
    // });
    // const items = await itemRepo.find({ select: ["ItemID_DE", "ean"] });
    // for (const item of items) {
    //   const ean = item.EAN;
    //   const newItemId = csvData[ean];
    //   if (newItemId && String(newItemId) !== String(item.ItemID_DE)) {
    //     // Update Item
    //     await itemRepo.update({ EAN: ean }, { ItemID_DE: parseInt(newItemId) });
    //     // Update OrderItems (mapped via the ID string in your Laravel logic)
    //     await orderItemRepo.update(
    //       { ItemID_DE: item.ItemID_DE },
    //       { ItemID_DE: parseInt(newItemId) },
    //     );
    //     // Update Warehouse
    //     // await warehouseRepo.update({ EAN: ean }, { ItemID_DE: parseInt(newItemId) });
    //   }
    // }
  }

  /**
   * whareHouseSync - Updates warehouse info from CSV
   */
  public static async whareHouseSync(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    // try {
    //   // const warehouseRepo = AppDataSource.getRepository(Warehouse);
    //   const filePath = path.join(EtlController.publicPath, "wareHouseItems.csv");
    //   const records = await EtlController.readCsv(filePath);
    //   for (const row of records) {
    //     // Column mapping: 0:ID, 1:Active, 2:MSQ, 3:ShipClass, 4:Qty
    //     /*
    //         await warehouseRepo.update(
    //             { ItemID_DE: row[0] },
    //             {
    //                 is_active: row[1],
    //                 msq: row[2],
    //                 ship_class: row[3],
    //                 stock_qty: row[4]
    //             }
    //         );
    //         */
    //   }
    //   res.status(200).json({
    //     success: true,
    //     message: "Warehouse items synched successfully!",
    //   });
    // } catch (error) {
    //   next(error);
    // }
  }
}
