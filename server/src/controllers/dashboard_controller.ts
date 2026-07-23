import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Item } from "../models/items";
import { OrderItem } from "../models/order_items";
import { WarehouseItem } from "../models/warehouse_items";
import { SupplierItem } from "../models/supplier_items";
import { VariationValue } from "../models/variation_values";
import fs from "fs";
import path from "path";

interface CacheData {
  timestamp: number;
  data: any;
}

let reportsCache: CacheData | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export const getAuditReports = async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === "true";
    if (!forceRefresh && reportsCache && (Date.now() - reportsCache.timestamp < CACHE_TTL)) {
      return res.status(200).json(reportsCache.data);
    }

    let currencyRates = {
      date: new Date().toISOString().split("T")[0],
      rates: {
        EUR: 1,
        USD: 1.16,
        RMB: 7.91,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch("https://api.frankfurter.app/latest?from=EUR", {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json();
        if (data && data.rates && data.rates.USD && data.rates.CNY) {
          currencyRates = {
            date: data.date || new Date().toISOString().split("T")[0],
            rates: {
              EUR: 1,
              USD: parseFloat(data.rates.USD.toFixed(4)),
              RMB: parseFloat(data.rates.CNY.toFixed(4)),
            },
          };
        }
      } else {
        throw new Error("Frankfurter API returned status " + response.status);
      }
    } catch (frankError) {
      console.warn("Frankfurter API offline, trying ExchangeRate-API...");
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch("https://open.er-api.com/v6/latest/EUR", {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data: any = await response.json();
          if (data && data.rates) {
            currencyRates = {
              date: data.time_last_update_utc
                ? new Date(data.time_last_update_utc).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              rates: {
                EUR: 1,
                USD: parseFloat(data.rates.USD.toFixed(4)),
                RMB: parseFloat(data.rates.CNY.toFixed(4)),
              },
            };
          }
        }
      } catch (erError) {
        console.warn("ExchangeRate-API offline, using cached fallbacks.");
      }
    }

    const activeItemSql = `(
      EXISTS (SELECT 1 FROM warehouse_item wi WHERE (wi.item_id = item.id OR (wi."ItemID_DE" = item."ItemID_DE" AND item."ItemID_DE" IS NOT NULL)) AND wi.is_active = 'Y')
      OR
      (NOT EXISTS (SELECT 1 FROM warehouse_item wi WHERE wi.item_id = item.id OR (wi."ItemID_DE" = item."ItemID_DE" AND item."ItemID_DE" IS NOT NULL)) AND item.isActive = 'Y')
    )`;

    const [
      unassignedCargoCount,
      purchaseProblemsCount,
      checkProblemsCount,
      rmbSpecialNoValueCount,
      eurSpecialNoValueCount,
      dimensionSpecialNoValueCount,
      missingVarValuesEnCount,
      noTaricCodeCount,
      mismatchedTaricsCount,
      nullCategoryCount,
      wrongShippingClassCount,
      itemsWithoutSuppliersCount,
      itemsWithoutRmbPriceCount,
      isPoNoUrlNullCount,
      supplierItemsIsPoNullCount,
      newPictureRequiredCount,
      itemsWithoutPictureCount,
      multipleParentsPicturesRaw,
    ] = await Promise.all([
      AppDataSource.getRepository(OrderItem)
        .createQueryBuilder("oi")
        .innerJoin("oi.order", "o")
        .where("oi.cargo_id IS NULL OR oi.cargo_id = 0")
        .select("COUNT(DISTINCT oi.order_id)", "cnt")
        .getRawOne()
        .then((res) => Number(res?.cnt || 0)),

      AppDataSource.getRepository(OrderItem)
        .createQueryBuilder("oi")
        .innerJoin("oi.order", "o")
        .where("oi.problems IS NOT NULL AND oi.problems != '' AND (oi.problems LIKE :p1 OR oi.problems LIKE :p2 OR oi.status LIKE :p1)", { p1: "%purchase%", p2: "%buy%" })
        .getCount(),

      AppDataSource.getRepository(OrderItem)
        .createQueryBuilder("oi")
        .innerJoin("oi.order", "o")
        .where("oi.problems IS NOT NULL AND oi.problems != '' AND (oi.problems LIKE :p1 OR oi.problems LIKE :p2 OR oi.status LIKE :p1)", { p1: "%check%", p2: "%verify%" })
        .getCount(),

      AppDataSource.getRepository(OrderItem)
        .createQueryBuilder("oi")
        .innerJoin("oi.order", "o")
        .innerJoin("oi.item", "item")
        .leftJoin("supplier_item", "si", "si.item_id = item.id AND si.is_default = 'Y'")
        .where("item.is_rmb_special = 'Y'")
        .andWhere("(si.price_rmb IS NULL OR si.price_rmb = 0)")
        .getCount(),

      AppDataSource.getRepository(OrderItem)
        .createQueryBuilder("oi")
        .innerJoin("oi.order", "o")
        .innerJoin("oi.item", "item")
        .where("item.is_eur_special = 'Y'")
        .andWhere("(item.price IS NULL OR item.price = 0 OR item.transfer_price_EUR IS NULL OR item.transfer_price_EUR = 0)")
        .getCount(),

      AppDataSource.getRepository(OrderItem)
        .createQueryBuilder("oi")
        .innerJoin("oi.order", "o")
        .innerJoin("oi.item", "item")
        .where("item.is_dimension_special = 'Y'")
        .andWhere("(item.weight IS NULL OR item.weight = 0 OR item.length IS NULL OR item.length = 0 OR item.width IS NULL OR item.width = 0 OR item.height IS NULL OR item.height = 0)")
        .getCount(),

      AppDataSource.getRepository(Item)
        .createQueryBuilder("item")
        .where(activeItemSql)
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select("1")
            .from(VariationValue, "vv")
            .where("vv.item_id = item.id")
            .andWhere(
              "((vv.value_de IS NOT NULL AND vv.value_de != '' AND (vv.value_en IS NULL OR vv.value_en = '')) OR " +
                "(vv.value_de_2 IS NOT NULL AND vv.value_de_2 != '' AND (vv.value_en_2 IS NULL OR vv.value_en_2 = '')) OR " +
                "(vv.value_de_3 IS NOT NULL AND vv.value_de_3 != '' AND (vv.value_en_3 IS NULL OR vv.value_en_3 = '')))",
            );
          return `EXISTS ${subQuery.getQuery()}`;
        })
        .getCount(),

      AppDataSource.getRepository(Item)
        .createQueryBuilder("item")
        .where(activeItemSql)
        .andWhere("(item.taric_id IS NULL OR item.taric_id = 0)")
        .getCount(),

      AppDataSource.getRepository(Item)
        .createQueryBuilder("item")
        .innerJoin("item.parent", "p")
        .where(activeItemSql)
        .andWhere("item.taric_id IS NOT NULL AND item.taric_id != 0")
        .andWhere("p.taric_id IS NOT NULL AND p.taric_id != 0")
        .andWhere("item.taric_id <> p.taric_id")
        .getCount(),

      AppDataSource.getRepository(Item)
        .createQueryBuilder("item")
        .where(activeItemSql)
        .andWhere("(item.cat_id IS NULL OR item.cat_id = 0)")
        .getCount(),

      AppDataSource.getRepository(WarehouseItem)
        .createQueryBuilder("wi")
        .where("wi.ship_class IS NULL OR wi.ship_class = 'Na' OR wi.ship_class = 'NA' OR wi.ship_class = ''")
        .getCount(),

      AppDataSource.getRepository(Item)
        .createQueryBuilder("item")
        .leftJoin("supplier_item", "si", "si.item_id = item.id AND si.is_default = 'Y'")
        .where(activeItemSql)
        .andWhere("(item.supplier_id IS NULL OR item.supplier_id = 0)")
        .andWhere("(si.supplier_id IS NULL OR si.supplier_id = 0)")
        .getCount(),

      AppDataSource.getRepository(Item)
        .createQueryBuilder("item")
        .leftJoin("supplier_item", "si", "si.item_id = item.id AND si.is_default = 'Y'")
        .where(activeItemSql)
        .andWhere("(si.price_rmb IS NULL OR si.price_rmb = 0)")
        .getCount(),

      AppDataSource.getRepository(Item)
        .createQueryBuilder("item")
        .innerJoin("supplier_item", "si", "si.item_id = item.id AND si.is_default = 'Y'")
        .where(activeItemSql)
        .andWhere("si.is_po = 'No'")
        .andWhere("(si.url IS NULL OR si.url = '' OR si.url = 'null' OR si.url = 'NULL')")
        .getCount(),

      AppDataSource.getRepository(Item)
        .createQueryBuilder("item")
        .innerJoin("supplier_item", "si", "si.item_id = item.id AND si.is_default = 'Y'")
        .where(activeItemSql)
        .andWhere("(si.is_po IS NULL OR si.is_po = '' OR si.is_po = 'null' OR si.is_po = 'NULL')")
        .getCount(),

      AppDataSource.getRepository(Item)
        .createQueryBuilder("item")
        .where(activeItemSql)
        .andWhere("item.is_npr = 'Y'")
        .getCount(),

      AppDataSource.getRepository(Item)
        .createQueryBuilder("item")
        .where(activeItemSql)
        .andWhere("(item.photo IS NULL OR item.photo = '' OR item.photo = 'null' OR item.photo = 'NULL')")
        .getCount(),

      AppDataSource.getRepository(Item)
        .createQueryBuilder("item")
        .where(activeItemSql)
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select("sub_item.photo")
            .from(Item, "sub_item")
            .where("sub_item.photo IS NOT NULL AND sub_item.photo != '' AND sub_item.photo != 'null' AND sub_item.photo != 'NULL' AND sub_item.parent_id IS NOT NULL")
            .groupBy("sub_item.photo")
            .having("COUNT(DISTINCT sub_item.parent_id) > 1");
          return `item.photo IN ${subQuery.getQuery()}`;
        })
        .getCount(),
    ]);

    const multipleParentsPicturesCount = multipleParentsPicturesRaw;

    let unusedPicturesCount = 0;
    try {
      const uploadDir = path.join(process.cwd(), "uploads");
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        const itemsWithPhotos = await AppDataSource.getRepository(Item)
          .createQueryBuilder("item")
          .select(["item.photo", "item.pix_path", "item.pix_path_eBay"])
          .where("item.photo IS NOT NULL OR item.pix_path IS NOT NULL OR item.pix_path_eBay IS NOT NULL")
          .getRawMany();

        const referencedPhotos = new Set<string>();
        itemsWithPhotos.forEach((item) => {
          const photo = item.item_photo || item.photo;
          const pixPath = item.item_pix_path || item.pix_path;
          const pixPathEbay = item.item_pix_path_eBay || item.pix_path_eBay;

          if (photo) referencedPhotos.add(path.basename(photo).trim());
          if (pixPath) referencedPhotos.add(path.basename(pixPath).trim());
          if (pixPathEbay) referencedPhotos.add(path.basename(pixPathEbay).trim());
        });

        let unusedCount = 0;
        for (const file of files) {
          if (!referencedPhotos.has(file)) {
            try {
              const stats = fs.statSync(path.join(uploadDir, file));
              if (stats.isFile()) {
                unusedCount++;
              }
            } catch (e) {
            }
          }
        }
        unusedPicturesCount = unusedCount;
      }
    } catch (e) {
      console.error("Error listing unused pictures:", e);
    }

    const responseData = {
      success: true,
      data: {
        currencyRates,
        controlData: {
          orders: [
            { label: "Orders unassigned to cargo", count: unassignedCargoCount, type: "unassigned_cargo" },
            { label: "Orders with purchase problem", count: purchaseProblemsCount, type: "purchase_problem" },
            { label: "Orders with Check Problem", count: checkProblemsCount, type: "check_problem" },
            { label: "RMB Special SET with no value", count: rmbSpecialNoValueCount, type: "rmb_special_no_value" },
            { label: "EUR Special SET with no value", count: eurSpecialNoValueCount, type: "eur_special_no_value" },
            { label: "Dimention Special SET with no value", count: dimensionSpecialNoValueCount, type: "dimension_special_no_value" },
          ],
          items: [
            { label: "Missing Var Values EN", count: missingVarValuesEnCount, type: "missing_var_values_en" },
            { label: "Items with No Taric Code", count: noTaricCodeCount, type: "no_taric" },
            { label: "Items with mismatched tarics", count: mismatchedTaricsCount, type: "mismatched_tarics" },
            { label: "Items with null category", count: nullCategoryCount, type: "null_category" },
            { label: "Items with wrong shipping class (Na)", count: wrongShippingClassCount, type: "wrong_shipping_class" },
          ],
          suppliers: [
            { label: "Items without suppliers", count: itemsWithoutSuppliersCount, type: "no_supplier" },
            { label: "Items without RMB Price", count: itemsWithoutRmbPriceCount, type: "no_rmb_price" },
            { label: "Items isPO ='No' with URL='null'", count: isPoNoUrlNullCount, type: "is_po_no_url_null" },
            { label: "Suppliers items isPO ='null'", count: supplierItemsIsPoNullCount, type: "is_po_null" },
          ],
          pictures: [
            { label: "Is New Picture Required", count: newPictureRequiredCount, type: "new_picture_required" },
            { label: "List unused pictures", count: unusedPicturesCount, type: "unused_pictures" },
            { label: "Items without picture", count: itemsWithoutPictureCount, type: "no_picture" },
            { label: "Picture with multiple parents", count: multipleParentsPicturesCount, type: "multiple_parents_pictures" },
          ],
        },
      },
    };

    reportsCache = {
      timestamp: Date.now(),
      data: responseData,
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Dashboard Auditing Reports Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during auditing calculations",
      error: (error as any).message,
    });
  }
};
