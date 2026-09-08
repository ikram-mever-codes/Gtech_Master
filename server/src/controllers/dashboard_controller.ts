import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Item } from "../models/items";
import fs from "fs";
import path from "path";

interface CacheData {
  timestamp: number;
  data: any;
}

let reportsCache: CacheData | null = null;
const CACHE_TTL = 30000;

let cachedCurrencyRates: any = null;
let lastCurrencyFetchTime = 0;
const CURRENCY_CACHE_TTL = 3600000;

async function fetchCurrencyRates() {
  const now = Date.now();
  if (cachedCurrencyRates && (now - lastCurrencyFetchTime < CURRENCY_CACHE_TTL)) {
    return cachedCurrencyRates;
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
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const response = await fetch("https://api.frankfurter.app/latest?from=EUR", {
      signal: controller.signal,
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
    }
  } catch (err) {
  }

  cachedCurrencyRates = currencyRates;
  lastCurrencyFetchTime = now;
  return currencyRates;
}

export const getAuditReports = async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === "true";
    if (!forceRefresh && reportsCache && (Date.now() - reportsCache.timestamp < CACHE_TTL)) {
      return res.status(200).json(reportsCache.data);
    }

    const currencyRatesPromise = fetchCurrencyRates();

    const cteQuery = `
      WITH active_items AS (
        SELECT item_id AS id FROM warehouse_item WHERE is_active = 'Y' AND item_id IS NOT NULL
        UNION
        SELECT i.id FROM item i INNER JOIN warehouse_item wi ON wi."ItemID_DE" = i."ItemID_DE" WHERE wi.is_active = 'Y' AND i."ItemID_DE" IS NOT NULL AND (wi.item_id IS NULL OR wi.item_id <> i.id)
        UNION
        SELECT i.id FROM item i WHERE i."isActive" = 'Y' AND NOT EXISTS (SELECT 1 FROM warehouse_item wi WHERE wi.item_id = i.id OR (wi."ItemID_DE" = i."ItemID_DE" AND i."ItemID_DE" IS NOT NULL))
      )
      SELECT
        (SELECT COUNT(1) FROM "order" o LEFT JOIN cargo c ON c.id = o.cargo_id WHERE o.cargo_id IS NULL OR o.cargo_id = 0 OR c.id IS NULL) AS unassigned_cargo,
        (SELECT COUNT(1) FROM order_item oi INNER JOIN "order" o ON o.id = oi.order_id WHERE oi.problems IS NOT NULL AND oi.problems != '' AND (oi.problems LIKE '%purchase%' OR oi.problems LIKE '%buy%' OR oi.status LIKE '%purchase%')) AS purchase_problems,
        (SELECT COUNT(1) FROM order_item oi INNER JOIN "order" o ON o.id = oi.order_id WHERE oi.problems IS NOT NULL AND oi.problems != '' AND (oi.problems LIKE '%check%' OR oi.problems LIKE '%verify%' OR oi.status LIKE '%check%')) AS check_problems,
        (SELECT COUNT(1) FROM order_item oi INNER JOIN "order" o ON o.id = oi.order_id INNER JOIN item ON item.id = oi.item_id LEFT JOIN supplier_item si ON si.item_id = item.id AND si.is_default = 'Y' WHERE item.is_rmb_special = 'Y' AND (si.price_rmb IS NULL OR si.price_rmb = 0)) AS rmb_special_no_value,
        (SELECT COUNT(1) FROM order_item oi INNER JOIN "order" o ON o.id = oi.order_id INNER JOIN item ON item.id = oi.item_id WHERE item.is_eur_special = 'Y' AND (item.price IS NULL OR item.price = 0) AND (item."transfer_price (EUR)" IS NULL OR item."transfer_price (EUR)" = 0)) AS eur_special_no_value,
        (SELECT COUNT(1) FROM order_item oi INNER JOIN "order" o ON o.id = oi.order_id INNER JOIN item ON item.id = oi.item_id WHERE item.is_dimension_special = 'Y' AND (item.weight IS NULL OR item.weight = 0 OR item.length IS NULL OR item.length = 0 OR item.width IS NULL OR item.width = 0 OR item.height IS NULL OR item.height = 0)) AS dimension_special_no_value,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id WHERE EXISTS (SELECT 1 FROM variation_value vv WHERE vv.item_id = i.id AND ((vv.value_de IS NOT NULL AND vv.value_de != '' AND (vv.value_en IS NULL OR vv.value_en = '')) OR (vv.value_de_2 IS NOT NULL AND vv.value_de_2 != '' AND (vv.value_en_2 IS NULL OR vv.value_en_2 = '')) OR (vv.value_de_3 IS NOT NULL AND vv.value_de_3 != '' AND (vv.value_en_3 IS NULL OR vv.value_en_3 = ''))))) AS missing_var_values_en,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id WHERE i.taric_id IS NULL OR i.taric_id = 0) AS no_taric,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id INNER JOIN parent p ON p.id = i.parent_id WHERE i.taric_id IS NOT NULL AND i.taric_id != 0 AND p.taric_id IS NOT NULL AND p.taric_id != 0 AND i.taric_id <> p.taric_id) AS mismatched_tarics,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id WHERE i.cat_id IS NULL OR i.cat_id = 0) AS null_category,
        (SELECT COUNT(1) FROM warehouse_item wi WHERE wi.ship_class IS NULL OR wi.ship_class = 'Na' OR wi.ship_class = 'NA' OR wi.ship_class = '') AS wrong_shipping_class,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id LEFT JOIN supplier_item si ON si.item_id = i.id AND si.is_default = 'Y' WHERE (i.supplier_id IS NULL OR i.supplier_id = 0) AND (si.supplier_id IS NULL OR si.supplier_id = 0)) AS no_supplier,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id WHERE NOT EXISTS (SELECT 1 FROM supplier_item si WHERE si.item_id = i.id AND si.is_default = 'Y' AND si.price_rmb IS NOT NULL AND si.price_rmb > 0)) AS no_rmb_price,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id INNER JOIN supplier_item si ON si.item_id = i.id AND si.is_default = 'Y' WHERE si.is_po = 'No' AND (si.url IS NULL OR si.url = '' OR si.url = 'null' OR si.url = 'NULL')) AS is_po_no_url_null,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id INNER JOIN supplier_item si ON si.item_id = i.id AND si.is_default = 'Y' WHERE si.is_po IS NULL OR si.is_po = '' OR si.is_po = 'null' OR si.is_po = 'NULL') AS is_po_null,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id WHERE i.is_npr = 'Y') AS new_picture_required,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id WHERE (i.photo IS NULL OR i.photo = '' OR i.photo = 'null' OR i.photo = 'NULL')) AS no_picture,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id WHERE i.photo IN (SELECT sub_item.photo FROM item sub_item WHERE sub_item.photo IS NOT NULL AND sub_item.photo != '' AND sub_item.photo != 'null' AND sub_item.photo != 'NULL' AND sub_item.parent_id IS NOT NULL GROUP BY sub_item.photo HAVING COUNT(DISTINCT sub_item.parent_id) > 1)) AS multiple_parents_pictures,
        (SELECT COUNT(1) FROM rechnungen r LEFT JOIN rechnung_customers c ON c.id = r.rechnung_customer_id WHERE (r.tax_profile_case IN ('EU_IGL', 'third_country') OR (c.country IS NOT NULL AND c.country != '' AND c.country NOT IN ('DE', 'Deutschland', 'DEU'))) AND (r.gelangenheitsbestaetigung_doc IS NULL OR r.gelangenheitsbestaetigung_doc = '' OR r.gelangenheitsbestaetigung_doc = 'null')) AS missing_gelangenheits,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id WHERE i.ean IS NULL OR i.ean = '' OR i.ean = 'null') AS no_ean,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id WHERE i.ean IS NOT NULL AND i.ean != '' AND i.ean != 'null' AND EXISTS (SELECT 1 FROM item i2 WHERE i2.ean = i.ean AND i2.id <> i.id)) AS duplicate_ean,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id LEFT JOIN supplier_item si ON si.item_id = i.id AND si.is_default = 'Y' WHERE i.supplier_id = 1 OR si.supplier_id = 1) AS assigned_supplier_1,
        (SELECT COUNT(1) FROM item i INNER JOIN active_items ai ON ai.id = i.id WHERE i.sales_price IS NULL OR i.sales_price = 0) AS no_sales_price,
        (SELECT COUNT(1) FROM customer c WHERE c.default_tax_profile_id IS NULL) AS business_without_tax_profile,
        (SELECT COUNT(1) FROM customer c LEFT JOIN star_business_details sbd ON sbd.id = c."starBusinessDetailsId" LEFT JOIN contact_person cp ON cp.star_business_details_id = sbd.id WHERE (c."contactName" IS NULL OR c."contactName" = '') AND (c."contactEmail" IS NULL OR c."contactEmail" = '') AND (c."contactPhoneNumber" IS NULL OR c."contactPhoneNumber" = '') AND cp.id IS NULL) AS business_without_contact,
        (SELECT COUNT(1) FROM inquiry inq WHERE NOT EXISTS (SELECT 1 FROM requested_item ri WHERE ri.inquiry_id = inq.id)) AS inquiry_without_request_item
    `;

    const [dbResult, currencyRates] = await Promise.all([
      AppDataSource.manager.query(cteQuery),
      currencyRatesPromise,
    ]);

    const counts = dbResult[0] || {};

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
            { label: "Orders unassigned to cargo", count: parseInt(counts.unassigned_cargo || "0", 10), type: "unassigned_cargo" },
            { label: "Inquiry without Request Item", count: parseInt(counts.inquiry_without_request_item || "0", 10), type: "inquiry_without_request_item" },
            { label: "RMB Special SET with no value", count: parseInt(counts.rmb_special_no_value || "0", 10), type: "rmb_special_no_value" },
            { label: "EUR Special SET with no value", count: parseInt(counts.eur_special_no_value || "0", 10), type: "eur_special_no_value" },
            { label: "Dimension Special SET with no value", count: parseInt(counts.dimension_special_no_value || "0", 10), type: "dimension_special_no_value" },
            { label: "Auslandslieferungen OHNE Gelangenheitsbestätigung/Ausfuhrnachweis", count: parseInt(counts.missing_gelangenheits || "0", 10), type: "missing_gelangenheitsbestaetigung" },
            { label: "Business without tax profile", count: parseInt(counts.business_without_tax_profile || "0", 10), type: "business_without_tax_profile" },
            { label: "Businesses WITHOUT contact", count: parseInt(counts.business_without_contact || "0", 10), type: "businesses_without_contact" },
          ],
          items: [
            { label: "Item without EAN", count: parseInt(counts.no_ean || "0", 10), type: "no_ean" },
            { label: "duplicate EAN", count: parseInt(counts.duplicate_ean || "0", 10), type: "duplicate_ean" },
            { label: "Items with No Taric Code", count: parseInt(counts.no_taric || "0", 10), type: "no_taric" },
            { label: "Items with mismatched tarics ?", count: parseInt(counts.mismatched_tarics || "0", 10), type: "mismatched_tarics" },
            { label: "Item without CAT", count: parseInt(counts.null_category || "0", 10), type: "null_category" },
          ],
          suppliers: [
            { label: "item PRO NOT assigned to company", count: parseInt(counts.no_supplier || "0", 10), type: "no_supplier" },
            { label: "Items PRO assigned to Supplier ID=1", count: parseInt(counts.assigned_supplier_1 || "0", 10), type: "assigned_supplier_1" },
            { label: "Items PRO without RMB Price", count: parseInt(counts.no_rmb_price || "0", 10), type: "no_rmb_price" },
            { label: "Items PRO without SP", count: parseInt(counts.no_sales_price || "0", 10), type: "no_sales_price" },
          ],
          pictures: [
            { label: "Is New Picture Required", count: parseInt(counts.new_picture_required || "0", 10), type: "new_picture_required" },
            { label: "List unused pictures", count: unusedPicturesCount, type: "unused_pictures" },
            { label: "Items without picture", count: parseInt(counts.no_picture || "0", 10), type: "no_picture" },
            { label: "Picture with multiple parents", count: parseInt(counts.multiple_parents_pictures || "0", 10), type: "multiple_parents_pictures" },
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
}
