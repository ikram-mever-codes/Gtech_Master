"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtlController = void 0;
const database_1 = require("../config/database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csv_parse_1 = require("csv-parse");
const typeorm_1 = require("typeorm");
const orders_1 = require("../models/orders");
const order_items_1 = require("../models/order_items");
const items_1 = require("../models/items");
const categories_1 = require("../models/categories");
class EtlController {
    static findTargetDate(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("=".repeat(50));
                console.log("Starting ETL process...");
                console.log("=".repeat(50));
                const orderRepo = database_1.AppDataSource.getRepository(orders_1.Order);
                const orderItemRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
                const categoryRepo = database_1.AppDataSource.getRepository(categories_1.Category);
                // Step 1: Sync categories
                console.log("\n📁 Step 1: Syncing categories...");
                yield EtlController.syncRequiredCategories(categoryRepo);
                // Step 2: Read orders from CSV
                console.log("\n📦 Step 2: Reading orders from CSV...");
                const ordersFilePath = path_1.default.join(EtlController.publicPath, "orders.csv");
                const orderRecords = yield EtlController.readCsv(ordersFilePath);
                if (orderRecords.length <= 1) {
                    throw new Error("No orders found in orders.csv");
                }
                const orderRows = orderRecords.slice(1);
                console.log(`Found ${orderRows.length} orders in CSV`);
                // Step 3: Process ALL orders from CSV (create or update based on status)
                console.log("\n📋 Step 3: Processing orders...");
                const orderMap = yield EtlController.processAllOrders(orderRows, orderRepo, categoryRepo);
                console.log(`\n✅ Orders processed: ${orderMap.size} orders in database`);
                // Step 4: Process order items (with upfront extraction, query check, and EAN fallback)
                console.log("\n📋 Step 4: Processing order items...");
                const orderItemsFilePath = path_1.default.join(EtlController.publicPath, "order_items.csv");
                if (fs_1.default.existsSync(orderItemsFilePath)) {
                    const itemRecords = yield EtlController.readCsv(orderItemsFilePath);
                    if (itemRecords.length > 1) {
                        console.log(`Found ${itemRecords.length - 1} order items in CSV`);
                        yield EtlController.processOrderItems(itemRecords.slice(1), orderItemRepo, orderMap);
                    }
                    else {
                        console.log("No order items found in CSV");
                    }
                }
                else {
                    console.log("order_items.csv not found");
                }
                // Step 4.5: Execute dynamic EAN mapping & fix missing ItemID_DE cross-links
                console.log("\n🔗 Step 4.5: Mapping items via EAN (ItemIDs.csv)...");
                const itemIdsFilePath = path_1.default.join(EtlController.publicPath, "ItemIDs.csv");
                yield EtlController.syncItemEanMappings(itemIdsFilePath, orderItemRepo);
                // Step 5: Delete orders that are NOT in the CSV (orders removed from MIS/WaWi)
                console.log("\n🗑️ Step 5: Removing orders not in MIS...");
                const deletedOrders = yield EtlController.deleteOrdersNotInCSV(orderRepo, orderItemRepo, orderRows);
                if (deletedOrders.length > 0) {
                    console.log(`\n✅ Removed ${deletedOrders.length} orders not in MIS:`);
                    deletedOrders.forEach((orderNo) => {
                        console.log(`   - Order ${orderNo} deleted`);
                    });
                }
                else {
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
            }
            catch (error) {
                console.error("❌ ETL process failed:", error);
                next(error);
            }
        });
    }
    /**
     * Process ALL orders from CSV - CREATE or UPDATE
     */
    static processAllOrders(rows, orderRepo, categoryRepo) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const orderMap = new Map();
            let created = 0;
            let updated = 0;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNum = i + 2;
                try {
                    const orderNo = (_a = row[0]) === null || _a === void 0 ? void 0 : _a.toString().trim();
                    if (!orderNo) {
                        console.error(`Row ${rowNum}: Missing order number`);
                        continue;
                    }
                    const csvCategoryId = parseInt(row[1]);
                    let databaseCategoryId = 55; // Default STD
                    if (!isNaN(csvCategoryId)) {
                        try {
                            databaseCategoryId = yield EtlController.getOrCreateCategory(csvCategoryId, categoryRepo);
                        }
                        catch (error) {
                            console.warn(`Row ${rowNum}: Error with category ${csvCategoryId}, using default 55`);
                        }
                    }
                    const dateCreated = EtlController.parseGermanDateStrict(row[4]);
                    const dateEmailed = EtlController.parseGermanDateStrict(row[5]);
                    const dateDelivery = EtlController.parseGermanDateStrict(row[6]);
                    let finalDateCreated;
                    let finalDateDelivery;
                    if (!dateCreated) {
                        console.error(`Row ${rowNum}: Missing date_created for order ${orderNo}, using current date`);
                        const currentDate = new Date().toISOString();
                        finalDateCreated = currentDate;
                        finalDateDelivery = dateDelivery || currentDate;
                    }
                    else {
                        finalDateCreated = dateCreated;
                        finalDateDelivery = dateDelivery || dateCreated;
                    }
                    const wawiStatus = ((_b = row[2]) === null || _b === void 0 ? void 0 : _b.toString().trim().toLowerCase()) || "";
                    let masterStatus = 20; // Default active status
                    if (wawiStatus === "teilgeliefert") {
                        masterStatus = 25;
                    }
                    else if (wawiStatus === "in bearbeitung") {
                        masterStatus = 20;
                    }
                    else {
                        masterStatus = 999; // Completed/Archived
                        console.log(`Row ${rowNum}: Order ${orderNo} has status "${wawiStatus}" - marking as inactive (999)`);
                    }
                    const orderData = {
                        order_no: orderNo,
                        category_id: databaseCategoryId,
                        status: masterStatus,
                        comment: ((_c = row[3]) === null || _c === void 0 ? void 0 : _c.toString().substring(0, 255)) || "",
                        date_created: finalDateCreated,
                        date_emailed: dateEmailed,
                        date_delivery: finalDateDelivery,
                    };
                    const existingOrder = yield orderRepo.findOne({
                        where: { order_no: orderNo },
                    });
                    if (existingOrder) {
                        yield orderRepo.update({ order_no: orderNo }, orderData);
                        orderMap.set(orderNo, existingOrder.id);
                        updated++;
                    }
                    else {
                        const newOrder = orderRepo.create(orderData);
                        const saved = yield orderRepo.save(newOrder);
                        orderMap.set(orderNo, saved.id);
                        created++;
                    }
                    if ((created + updated) % 10 === 0) {
                        console.log(`Progress: ${created + updated}/${rows.length} orders processed`);
                    }
                }
                catch (error) {
                    console.error(`Row ${rowNum}: Failed to process order:`, error);
                }
            }
            console.log(`\n Bars: ${created} created, ${updated} updated`);
            return orderMap;
        });
    }
    /**
     * Process order items - Extracts ItemID_DE upfront, queries existence, fallback to EAN mapping
     */
    static processOrderItems(rows, orderItemRepo, orderMap) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const itemRepo = database_1.AppDataSource.getRepository(items_1.Item);
            let created = 0;
            let updated = 0;
            let failed = 0;
            console.log(`\nProcessing ${rows.length} order items...`);
            // ----------------------------------------------------------------
            // OPTIMIZATION STEP 1: Extract all unique ItemID_DEs from CSV rows
            // ----------------------------------------------------------------
            const csvItemIdDes = new Set();
            for (const row of rows) {
                const itemIdDe = parseInt(row[1]);
                if (!isNaN(itemIdDe)) {
                    csvItemIdDes.add(itemIdDe);
                }
            }
            // ----------------------------------------------------------------
            // OPTIMIZATION STEP 2: Query database specifically for these keys
            // ----------------------------------------------------------------
            const existingItemsByDe = yield itemRepo.find({
                where: { ItemID_DE: (0, typeorm_1.In)(Array.from(csvItemIdDes)) },
                select: ["id", "ItemID_DE"],
            });
            // Create a precise lookup map for items existing via ItemID_DE
            const itemLookup = new Map(existingItemsByDe.map((i) => [i.ItemID_DE, i.id]));
            // ----------------------------------------------------------------
            // OPTIMIZATION STEP 3: Load active EAN catalog as quick-fallback map
            // ----------------------------------------------------------------
            const allEanItems = yield itemRepo.find({
                where: { isActive: "Y" },
                select: ["id", "ean"],
            });
            const eanLookup = new Map();
            for (const item of allEanItems) {
                if (item.ean) {
                    eanLookup.set(item.ean.trim(), item.id);
                }
            }
            // Track valid master_ids for stale item cleanup logic
            const orderToCsvMasterIds = new Map();
            for (const [_, orderId] of orderMap.entries()) {
                orderToCsvMasterIds.set(orderId, new Set());
            }
            // ----------------------------------------------------------------
            // STEP 4: Process rows row-by-row with built-in EAN fallback logic
            // ----------------------------------------------------------------
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNum = i + 2;
                try {
                    // Expected layout: 0: masterItemID, 1: ItemID_DE, 2: order_no, 3: qty, 4: remark, 5: qty_delivered, 6: ean (if mapped in your raw stream)
                    const masterId = (_a = row[0]) === null || _a === void 0 ? void 0 : _a.toString().trim();
                    const itemIdDe = parseInt(row[1]);
                    const orderNo = (_b = row[2]) === null || _b === void 0 ? void 0 : _b.toString().trim();
                    const qty = parseInt(row[3]);
                    const remarkDe = ((_c = row[4]) === null || _c === void 0 ? void 0 : _c.toString().trim()) || "";
                    const qtyDelivered = parseInt(row[5]) || 0;
                    const csvEan = (_d = row[6]) === null || _d === void 0 ? void 0 : _d.toString().trim(); // Dynamic programmatic mapping reference fallback column
                    if (!masterId) {
                        console.error(`Row ${rowNum}: Missing master_id`);
                        failed++;
                        continue;
                    }
                    if (!orderNo) {
                        console.error(`Row ${rowNum}: Missing order_no for master_id ${masterId}`);
                        failed++;
                        continue;
                    }
                    const orderId = orderMap.get(orderNo);
                    if (!orderId) {
                        console.warn(`Row ${rowNum}: Order ${orderNo} not found, skipping item ${masterId}`);
                        failed++;
                        continue;
                    }
                    if (!orderToCsvMasterIds.has(orderId)) {
                        orderToCsvMasterIds.set(orderId, new Set());
                    }
                    orderToCsvMasterIds.get(orderId).add(masterId);
                    let itemIdDeValue = null;
                    let itemId = null;
                    if (!isNaN(itemIdDe)) {
                        itemIdDeValue = itemIdDe;
                        // Step 4a: Look up existing match using our batched itemLookup map
                        itemId = itemLookup.get(itemIdDe) || null;
                        // Step 4b: CRITICAL FALLBACK - If it doesn't exist, try resolving item index using EAN fallback references
                        if (!itemId && csvEan) {
                            itemId = eanLookup.get(csvEan) || null;
                            if (itemId) {
                                console.log(`🔗 Row ${rowNum}: ItemID_DE ${itemIdDe} not found in catalog. Successfully mapped via structural EAN fallback to system Item ID: ${itemId}`);
                            }
                        }
                    }
                    let qtyValue = isNaN(qty) ? 0 : qty;
                    const existingItem = yield orderItemRepo.findOne({
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
                        const needsUpdate = existingItem.qty !== qtyValue ||
                            existingItem.remark_de !== remarkDe ||
                            existingItem.qty_delivered !== qtyDelivered ||
                            existingItem.item_id !== itemId || // Force field updates if resolved via fallback mapping changes
                            existingItem.ItemID_DE !== itemIdDeValue;
                        if (needsUpdate) {
                            yield orderItemRepo.update({ master_id: masterId }, itemData);
                            updated++;
                        }
                    }
                    else {
                        yield orderItemRepo.save(orderItemRepo.create(itemData));
                        created++;
                    }
                    if ((created + updated) % 50 === 0) {
                        console.log(`Progress: ${created + updated}/${rows.length} items processed`);
                    }
                }
                catch (error) {
                    console.error(`Row ${rowNum}: Failed to process item:`, error);
                    failed++;
                }
            }
            console.log(`\n📊 Items: ${created} created, ${updated} updated, ${failed} failed`);
            // Clean stale order items for processed orders
            let deletedCount = 0;
            for (const [orderId, csvMasterIds] of orderToCsvMasterIds.entries()) {
                const dbItems = yield orderItemRepo.find({
                    where: { order_id: orderId },
                    select: ["id", "master_id"],
                });
                const itemsToDelete = dbItems.filter((item) => !item.master_id || !csvMasterIds.has(item.master_id));
                if (itemsToDelete.length > 0) {
                    const idsToDelete = itemsToDelete.map((item) => item.id);
                    yield orderItemRepo.delete({ id: (0, typeorm_1.In)(idsToDelete) });
                    deletedCount += idsToDelete.length;
                }
            }
        });
    }
    /**
     * Reads ItemIDs.csv to link missing identifiers across Items and OrderItems dynamically using EAN
     */
    static syncItemEanMappings(filePath, orderItemRepo) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!fs_1.default.existsSync(filePath)) {
                console.log("⚠️ ItemIDs.csv mapping file not found. Skipping cross-linking mapping.");
                return;
            }
            const itemRepo = database_1.AppDataSource.getRepository(items_1.Item);
            const csvRecords = yield EtlController.readCsv(filePath);
            if (csvRecords.length <= 1) {
                console.log("⚠️ ItemIDs.csv is empty or missing data rows.");
                return;
            }
            const mappingRows = csvRecords.slice(1);
            const eanToItemIdDeMap = new Map();
            for (const row of mappingRows) {
                const itemIdDe = parseInt(row[0]);
                const ean = (_a = row[1]) === null || _a === void 0 ? void 0 : _a.toString().trim();
                if (!isNaN(itemIdDe) && ean) {
                    eanToItemIdDeMap.set(ean, itemIdDe);
                }
            }
            const targetItems = yield itemRepo.find({
                where: { isActive: "Y" },
            });
            let updatedItemsCount = 0;
            const itemDeToLocalIdMap = new Map();
            for (const item of targetItems) {
                if (item.ean && eanToItemIdDeMap.has(item.ean)) {
                    const matchingItemIdDe = eanToItemIdDeMap.get(item.ean);
                    if (!item.ItemID_DE || item.ItemID_DE !== matchingItemIdDe) {
                        item.ItemID_DE = matchingItemIdDe;
                        item.is_updated = true;
                        yield itemRepo.save(item);
                        updatedItemsCount++;
                    }
                    itemDeToLocalIdMap.set(matchingItemIdDe, item.id);
                }
                else if (item.ItemID_DE) {
                    itemDeToLocalIdMap.set(item.ItemID_DE, item.id);
                }
            }
            console.log(`🔗 Updated ${updatedItemsCount} global catalogs with missing system ItemID_DE numbers.`);
            const looseOrderItems = yield orderItemRepo.find({
                where: [{ item_id: undefined }, { item_id: null }],
            });
            let remappedOrderItemsCount = 0;
            for (const oItem of looseOrderItems) {
                if (oItem.ItemID_DE && itemDeToLocalIdMap.has(oItem.ItemID_DE)) {
                    oItem.item_id = itemDeToLocalIdMap.get(oItem.ItemID_DE);
                    yield orderItemRepo.save(oItem);
                    remappedOrderItemsCount++;
                }
            }
            console.log(`🔗 Repaired relational links across ${remappedOrderItemsCount} OrderItem entries using explicit mapping.`);
        });
    }
    /**
     * DELETE orders that are NOT in the CSV (orders removed from MIS/WaWi)
     */
    static deleteOrdersNotInCSV(orderRepo, orderItemRepo, allOrdersFromCSV) {
        return __awaiter(this, void 0, void 0, function* () {
            const deletedOrders = [];
            const allOrdersInDb = yield orderRepo.find({
                select: ["id", "order_no"],
            });
            const csvOrderNos = new Set(allOrdersFromCSV.map((row) => { var _a; return (_a = row[0]) === null || _a === void 0 ? void 0 : _a.toString().trim(); }).filter(Boolean));
            console.log(`Found ${allOrdersInDb.length} orders in database`);
            console.log(`Found ${csvOrderNos.size} orders in CSV`);
            const ordersToDelete = allOrdersInDb.filter((order) => !csvOrderNos.has(order.order_no));
            if (ordersToDelete.length === 0) {
                return [];
            }
            console.log(`\n🗑️ Deleting ${ordersToDelete.length} orders not in MIS...`);
            for (const order of ordersToDelete) {
                try {
                    yield orderItemRepo.delete({ order_id: order.id });
                    yield orderRepo.delete({ id: order.id });
                    deletedOrders.push(order.order_no);
                    console.log(`   ✅ Deleted order ${order.order_no}`);
                }
                catch (error) {
                    console.error(`   ❌ Failed to delete order ${order.order_no}:`, error);
                }
            }
            return deletedOrders;
        });
    }
    /**
     * Sync required categories - create if not exist
     */
    static syncRequiredCategories(categoryRepo) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const mapping of EtlController.CATEGORY_MAPPING) {
                try {
                    let category = yield categoryRepo.findOne({
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
                        yield categoryRepo.save(category);
                    }
                }
                catch (error) {
                    if (error.code === "23505") {
                        console.log(`Category ${mapping.name} already exists`);
                    }
                    else {
                        console.error(`Error creating category ${mapping.name}:`, error);
                    }
                }
            }
        });
    }
    /**
     * Get or create category - ALWAYS returns a valid category ID
     */
    static getOrCreateCategory(csvId, categoryRepo) {
        return __awaiter(this, void 0, void 0, function* () {
            let dbId = EtlController.CATEGORY_MAP.get(csvId);
            if (dbId) {
                const exists = yield categoryRepo.findOne({ where: { id: dbId } });
                if (exists)
                    return dbId;
            }
            const dynamicDeCat = `C${csvId}`.substring(0, 5);
            let category = yield categoryRepo.findOne({
                where: { de_cat: dynamicDeCat },
            });
            if (!category) {
                console.log(`Creating missing category for CSV ID: ${csvId}`);
                category = categoryRepo.create({
                    de_cat: dynamicDeCat,
                    name: `Imported ${csvId}`,
                    is_ignored_value: "N",
                });
                category = yield categoryRepo.save(category);
            }
            EtlController.CATEGORY_MAP.set(csvId, category.id);
            return category.id;
        });
    }
    /**
     * Parse German date format - STRICT: returns null if invalid
     */
    static parseGermanDateStrict(dateStr) {
        if (!dateStr || dateStr.trim() === "")
            return null;
        try {
            let cleaned = dateStr.trim().replace(/\s+/g, " ");
            for (const [de, num] of Object.entries(EtlController.MONTH_MAP)) {
                cleaned = cleaned.replace(new RegExp(de, "g"), num);
            }
            const date = new Date(cleaned);
            if (isNaN(date.getTime())) {
                console.warn(`Invalid date format: "${dateStr}"`);
                return null;
            }
            return date.toISOString();
        }
        catch (error) {
            console.warn(`Error parsing date: "${dateStr}"`);
            return null;
        }
    }
    /**
     * Helper: Read CSV file
     */
    static readCsv(filePath) {
        return new Promise((resolve) => {
            const records = [];
            if (!fs_1.default.existsSync(filePath)) {
                console.log(`File not found: ${path_1.default.basename(filePath)}`);
                return resolve([]);
            }
            fs_1.default.createReadStream(filePath)
                .pipe((0, csv_parse_1.parse)({
                delimiter: ",",
                relax_column_count: true,
                skip_empty_lines: true,
                trim: true,
            }))
                .on("data", (data) => records.push(data))
                .on("end", () => {
                console.log(`Loaded ${records.length} rows from ${path_1.default.basename(filePath)}`);
                resolve(records);
            })
                .on("error", (err) => {
                console.error(`Error reading CSV: ${path_1.default.basename(filePath)}`, err);
                resolve([]);
            });
        });
    }
    static whareHouseSync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(200).json({
                success: true,
                message: "Warehouse sync not implemented",
            });
        });
    }
    static synchIDs() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("synchIDs called - not implemented");
        });
    }
}
exports.EtlController = EtlController;
EtlController.publicPath = path_1.default.join(__dirname, "../../public");
EtlController.BATCH_SIZE = 100;
// Valid order statuses from WaWi (for active orders)
EtlController.VALID_WAWI_STATUSES = [
    "in Bearbeitung",
    "teilgeliefert",
];
// Category mapping based on your database
EtlController.CATEGORY_MAPPING = [
    { csvCategoryId: 26, databaseCategoryId: 55, name: "STD" },
    { csvCategoryId: 18, databaseCategoryId: 56, name: "GBL" },
    { csvCategoryId: 13, databaseCategoryId: 57, name: "GTR" },
    { csvCategoryId: 21, databaseCategoryId: 58, name: "PRO" },
    { csvCategoryId: 20, databaseCategoryId: 59, name: "ERS" },
    { csvCategoryId: 8, databaseCategoryId: 60, name: "TBA" },
];
EtlController.CATEGORY_MAP = new Map(EtlController.CATEGORY_MAPPING.map((m) => [
    m.csvCategoryId,
    m.databaseCategoryId,
]));
// German month mapping for date parsing
EtlController.MONTH_MAP = {
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
