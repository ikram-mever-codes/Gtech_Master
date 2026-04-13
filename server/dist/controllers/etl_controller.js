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
                // Step 4: Process order items
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
     * Orders with invalid status (completed/cancelled) will be marked as inactive
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
                    // Parse category
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
                    // Parse dates
                    const dateCreated = EtlController.parseGermanDateStrict(row[4]);
                    const dateEmailed = EtlController.parseGermanDateStrict(row[5]);
                    const dateDelivery = EtlController.parseGermanDateStrict(row[6]);
                    if (!dateCreated) {
                        console.error(`Row ${rowNum}: Missing date_created for order ${orderNo}, using current date`);
                        // Don't skip - use current date as fallback
                        const currentDate = new Date().toISOString();
                        var finalDateCreated = currentDate;
                        var finalDateDelivery = dateDelivery || currentDate;
                    }
                    else {
                        var finalDateCreated = dateCreated;
                        var finalDateDelivery = dateDelivery || dateCreated;
                    }
                    // Get the original WaWi status
                    const wawiStatus = ((_b = row[2]) === null || _b === void 0 ? void 0 : _b.toString().trim().toLowerCase()) || "";
                    // Determine master status based on WaWi status
                    let masterStatus = 20; // Default active status
                    if (wawiStatus === "teilgeliefert") {
                        masterStatus = 25; // Partially delivered
                    }
                    else if (wawiStatus === "in bearbeitung") {
                        masterStatus = 20; // In progress
                    }
                    else {
                        // Orders with other statuses (completed, cancelled, etc.) are marked as inactive
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
                    // Check if order exists
                    const existingOrder = yield orderRepo.findOne({
                        where: { order_no: orderNo },
                    });
                    if (existingOrder) {
                        // UPDATE existing order
                        yield orderRepo.update({ order_no: orderNo }, orderData);
                        orderMap.set(orderNo, existingOrder.id);
                        updated++;
                    }
                    else {
                        // CREATE new order
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
            console.log(`\n📊 Orders: ${created} created, ${updated} updated`);
            return orderMap;
        });
    }
    /**
     * Process order items - CREATE or UPDATE existing items
     */
    static processOrderItems(rows, orderItemRepo, orderMap) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const itemRepo = database_1.AppDataSource.getRepository(items_1.Item);
            let created = 0;
            let updated = 0;
            let failed = 0;
            // Get all items for lookup
            const allItems = yield itemRepo.find({ select: ["id", "ItemID_DE"] });
            const itemLookup = new Map(allItems.map((i) => [i.ItemID_DE, i.id]));
            console.log(`\nProcessing ${rows.length} order items...`);
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNum = i + 2;
                try {
                    // CORRECT COLUMN MAPPINGS for order_items.csv:
                    // 0: masterItemID, 1: ItemID_DE, 2: order_no, 3: qty, 4: remark, 5: qty_delivered
                    const masterId = (_a = row[0]) === null || _a === void 0 ? void 0 : _a.toString().trim();
                    const itemIdDe = parseInt(row[1]);
                    const orderNo = (_b = row[2]) === null || _b === void 0 ? void 0 : _b.toString().trim();
                    const qty = parseInt(row[3]);
                    const remarkDe = ((_c = row[4]) === null || _c === void 0 ? void 0 : _c.toString().trim()) || "";
                    const qtyDelivered = parseInt(row[5]) || 0;
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
                    // Get order ID
                    const orderId = orderMap.get(orderNo);
                    if (!orderId) {
                        console.warn(`Row ${rowNum}: Order ${orderNo} not found, skipping item ${masterId}`);
                        failed++;
                        continue;
                    }
                    // Handle ItemID_DE
                    let itemIdDeValue = null;
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
                        // UPDATE existing item if changed
                        const needsUpdate = existingItem.qty !== qtyValue ||
                            existingItem.remark_de !== remarkDe ||
                            existingItem.qty_delivered !== qtyDelivered ||
                            existingItem.ItemID_DE !== itemIdDeValue;
                        if (needsUpdate) {
                            yield orderItemRepo.update({ master_id: masterId }, itemData);
                            updated++;
                        }
                    }
                    else {
                        // CREATE new item
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
        });
    }
    /**
     * DELETE orders that are NOT in the CSV (orders removed from MIS/WaWi)
     */
    static deleteOrdersNotInCSV(orderRepo, orderItemRepo, allOrdersFromCSV) {
        return __awaiter(this, void 0, void 0, function* () {
            const deletedOrders = [];
            // Get all orders currently in database
            const allOrdersInDb = yield orderRepo.find({
                select: ["id", "order_no"],
            });
            // Get order numbers from ALL orders in CSV (not just filtered ones)
            const csvOrderNos = new Set(allOrdersFromCSV.map((row) => { var _a; return (_a = row[0]) === null || _a === void 0 ? void 0 : _a.toString().trim(); }).filter(Boolean));
            console.log(`Found ${allOrdersInDb.length} orders in database`);
            console.log(`Found ${csvOrderNos.size} orders in CSV`);
            // Find orders in database that are NOT in CSV
            const ordersToDelete = allOrdersInDb.filter((order) => !csvOrderNos.has(order.order_no));
            if (ordersToDelete.length === 0) {
                return [];
            }
            console.log(`\n🗑️ Deleting ${ordersToDelete.length} orders not in MIS...`);
            for (const order of ordersToDelete) {
                try {
                    // First delete all order items for this order
                    yield orderItemRepo.delete({ order_id: order.id });
                    // Then delete the order itself
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
            // Check if it's in our hardcoded map
            let dbId = EtlController.CATEGORY_MAP.get(csvId);
            if (dbId) {
                const exists = yield categoryRepo.findOne({ where: { id: dbId } });
                if (exists)
                    return dbId;
            }
            // Look for it by name
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
            // Cache it
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
    // Placeholder methods
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
