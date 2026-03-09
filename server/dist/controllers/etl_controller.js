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
    /**
     * Main ETL process with comprehensive error handling
     */
    static findTargetDate(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                console.log("Starting ETL process...");
                const orderRepo = database_1.AppDataSource.getRepository(orders_1.Order);
                const orderItemRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
                const categoryRepo = database_1.AppDataSource.getRepository(categories_1.Category);
                // FIX 1: Use the sync method instead of the strict validation method
                yield EtlController.syncRequiredCategories(categoryRepo);
                const ordersFilePath = path_1.default.join(EtlController.publicPath, "orders.csv");
                const orderRecords = yield EtlController.readCsv(ordersFilePath);
                const orderMap = new Map();
                const orderRows = orderRecords.slice(1);
                for (const row of orderRows) {
                    const orderNo = (_a = row[0]) === null || _a === void 0 ? void 0 : _a.toString().trim();
                    if (!orderNo)
                        continue;
                    ``;
                    let order = yield orderRepo.findOne({ where: { order_no: orderNo } });
                    if (!order) {
                        const csvCategoryId = parseInt(row[1]);
                        if (isNaN(csvCategoryId))
                            continue;
                        // FIX 2: Get or Create the category dynamically
                        const databaseCategoryId = yield EtlController.getOrCreateCategory(csvCategoryId, categoryRepo);
                        const status = parseInt(row[2]) || 0;
                        const dateCreated = EtlController.validateDate(row[4], "date_created");
                        const dateEmailed = EtlController.validateDate(row[5], "date_emailed", true);
                        const dateDelivery = EtlController.validateDate(row[6], "date_delivery");
                        const newOrder = orderRepo.create({
                            order_no: orderNo,
                            category_id: databaseCategoryId,
                            status: status,
                            comment: ((_b = row[3]) === null || _b === void 0 ? void 0 : _b.toString().substring(0, 255)) || "",
                            date_created: dateCreated,
                            date_emailed: dateEmailed,
                            date_delivery: dateDelivery,
                        });
                        order = yield orderRepo.save(newOrder);
                    }
                    orderMap.set(orderNo, order.id);
                }
                // Process items...
                const orderItemsFilePath = path_1.default.join(EtlController.publicPath, "order_items.csv");
                if (fs_1.default.existsSync(orderItemsFilePath)) {
                    const itemRecords = yield EtlController.readCsv(orderItemsFilePath);
                    yield EtlController.processOrderItemBatch(itemRecords.slice(1), orderItemRepo, orderMap);
                }
                res.status(200).json({ success: true, message: "ETL process completed" });
            }
            catch (error) {
                console.error("ETL process failed:", error);
                next(error);
            }
        });
    }
    /**
     * Process a batch of orders
     */
    static processOrderBatch(rows, orderRepo, categoryRepo) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const results = {
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
                    const orderNo = (_a = row[0]) === null || _a === void 0 ? void 0 : _a.toString().trim();
                    if (!orderNo) {
                        throw new Error("Order number is empty");
                    }
                    // Check if order already exists
                    const existingOrder = yield orderRepo.findOne({
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
                    const databaseCategoryId = EtlController.CATEGORY_MAP.get(csvCategoryId);
                    if (!databaseCategoryId) {
                        throw new Error(`No mapping found for category ID ${csvCategoryId}`);
                    }
                    // Verify category exists in database
                    const category = yield categoryRepo.findOne({
                        where: { id: databaseCategoryId },
                    });
                    if (!category) {
                        throw new Error(`Category ID ${databaseCategoryId} not found in database`);
                    }
                    // Parse status
                    const status = parseInt(row[2]);
                    if (isNaN(status)) {
                        throw new Error(`Invalid status: ${row[2]}`);
                    }
                    // Validate and parse dates
                    const dateCreated = EtlController.validateDate(row[4], "date_created");
                    const dateEmailed = EtlController.validateDate(row[5], "date_emailed", true);
                    const dateDelivery = EtlController.validateDate(row[6], "date_delivery");
                    // Create order
                    const newOrder = orderRepo.create({
                        order_no: orderNo,
                        category_id: databaseCategoryId,
                        status: status,
                        comment: ((_b = row[3]) === null || _b === void 0 ? void 0 : _b.toString().substring(0, 255)) || "", // Truncate if needed
                        date_created: dateCreated,
                        date_emailed: dateEmailed,
                        date_delivery: dateDelivery,
                    });
                    yield orderRepo.save(newOrder);
                    results.created++;
                    console.log(`Order ${orderNo} created successfully`);
                }
                catch (error) {
                    results.failed++;
                    results.errors.push({
                        type: "order_processing_error",
                        message: error instanceof Error ? error.message : "Unknown error",
                        data: { row, orderNo: row === null || row === void 0 ? void 0 : row[0] },
                    });
                    console.error(`Failed to process order ${row === null || row === void 0 ? void 0 : row[0]}`, error);
                }
            }
            return results;
        });
    }
    /**
     * Process a batch of order items
     */
    static processOrderItemBatch(rows, orderItemRepo, existingOrders) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const itemRepo = database_1.AppDataSource.getRepository(items_1.Item); // Get Item Repository
            const results = {
                processed: 0,
                created: 0,
                skipped: 0,
                failed: 0,
            };
            for (const row of rows) {
                try {
                    results.processed++;
                    const masterId = (_a = row[0]) === null || _a === void 0 ? void 0 : _a.toString().trim();
                    const itemIdDe = parseInt(row[1]); // This is the ItemID_DE from CSV
                    const orderNo = (_b = row[2]) === null || _b === void 0 ? void 0 : _b.toString().trim();
                    const qty = parseInt(row[3]);
                    const remarkDe = ((_c = row[4]) === null || _c === void 0 ? void 0 : _c.toString().trim()) || "";
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
                    const actualItem = yield itemRepo.findOne({
                        where: { ItemID_DE: itemIdDe },
                        select: ["id"],
                    });
                    if (!actualItem) {
                        console.warn(`Item with ItemID_DE ${itemIdDe} not found in Items table. Link will be missing.`);
                    }
                    const existingItem = yield orderItemRepo.findOne({
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
                    yield orderItemRepo.save(newItem);
                    results.created++;
                }
                catch (error) {
                    results.failed++;
                    console.error(`Failed to process order item:`, error);
                }
            }
            return results;
        });
    }
    /**
     * Validate that all required category mappings exist
     */
    static validateCategoryMappings(categoryRepo) {
        return __awaiter(this, void 0, void 0, function* () {
            const requiredCategoryIds = Array.from(EtlController.CATEGORY_MAP.values());
            const existingCategories = yield categoryRepo.find({
                where: { id: (0, typeorm_1.In)(requiredCategoryIds) },
            });
            const existingIds = new Set(existingCategories.map((c) => c.id));
            const missingIds = requiredCategoryIds.filter((id) => !existingIds.has(id));
            if (missingIds.length > 0) {
                throw new Error(`Missing categories in database: ${missingIds.join(", ")}`);
            }
            console.log("Category mappings validated", {
                total: requiredCategoryIds.length,
                existing: existingCategories.length,
            });
        });
    }
    static syncRequiredCategories(categoryRepo) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const mapping of EtlController.CATEGORY_MAPPING) {
                let category = yield categoryRepo.findOne({
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
                    yield categoryRepo.save(category);
                }
            }
        });
    }
    /**
     * Validate and parse date string
     */
    static validateDate(dateStr, fieldName, allowNull = false) {
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
        }
        catch (error) {
            throw new Error(`Invalid ${fieldName}: ${dateStr}`);
        }
    }
    /**
     * Run cleanup tasks
     */
    static runCleanupTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("Starting cleanup tasks");
                yield Promise.allSettled([
                    EtlController.removeUnmatchedOrders(),
                    EtlController.removeUnmatchedItems(),
                    EtlController.updateOrderItemQty(),
                ]);
                console.log("Cleanup tasks completed");
            }
            catch (error) {
                console.error("Cleanup tasks failed", error);
                // Don't throw - cleanup failures shouldn't stop the main process
            }
        });
    }
    /**
     * Remove unmatched orders with error handling
     */
    static removeUnmatchedOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            yield queryRunner.connect();
            try {
                yield queryRunner.startTransaction();
                const orderRepo = queryRunner.manager.getRepository(orders_1.Order);
                const ordersFilePath = path_1.default.join(EtlController.publicPath, "orders.csv");
                const records = yield EtlController.readCsv(ordersFilePath);
                // Handle case when CSV is empty or has only header
                const csvOrderNos = records.length > 1
                    ? records
                        .slice(1)
                        .map((r) => { var _a; return (_a = r[0]) === null || _a === void 0 ? void 0 : _a.toString().trim(); })
                        .filter(Boolean)
                    : [];
                // Find orders not in CSV and not containing "DENI"
                const existingOrders = yield orderRepo.find({
                    where: {
                        order_no: (0, typeorm_1.Not)((0, typeorm_1.Like)("%DENI%")),
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
                        yield orderRepo.delete({ order_no: (0, typeorm_1.In)(batch) });
                        console.log(`Deleted ${batch.length} unmatched orders`);
                    }
                }
                yield queryRunner.commitTransaction();
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.error("Error removing unmatched orders", error);
                throw error;
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    /**
     * Tries to find a category in the map/database,
     * if not found, it creates it.
     */
    static getOrCreateCategory(csvId, categoryRepo) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Check if it's in our hardcoded map
            let dbId = EtlController.CATEGORY_MAP.get(csvId);
            // 2. If it's in the map, double check it actually exists in DB
            if (dbId) {
                const exists = yield categoryRepo.findOne({ where: { id: dbId } });
                if (exists)
                    return dbId;
            }
            // 3. If not in map OR not in DB, look for it by name (e.g. "CAT21")
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
            // 4. Cache it in the map so we don't query the DB for this ID again this session
            EtlController.CATEGORY_MAP.set(csvId, category.id);
            return category.id;
        });
    }
    /**
     * Remove unmatched items with error handling
     */
    static removeUnmatchedItems() {
        return __awaiter(this, void 0, void 0, function* () {
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            yield queryRunner.connect();
            try {
                yield queryRunner.startTransaction();
                const orderItemRepo = queryRunner.manager.getRepository(order_items_1.OrderItem);
                const orderItemsFilePath = path_1.default.join(EtlController.publicPath, "order_items.csv");
                if (!fs_1.default.existsSync(orderItemsFilePath)) {
                    console.warn("Order items CSV not found, skipping unmatched items removal");
                    return;
                }
                const records = yield EtlController.readCsv(orderItemsFilePath);
                // Handle case when CSV is empty or has only header
                const csvMasterIds = records.length > 1
                    ? records
                        .slice(1)
                        .map((r) => { var _a; return (_a = r[0]) === null || _a === void 0 ? void 0 : _a.toString().trim(); })
                        .filter(Boolean)
                    : [];
                const existingItems = yield orderItemRepo.find({
                    where: { master_id: (0, typeorm_1.Not)((0, typeorm_1.Like)("%MIS%")) },
                    select: ["master_id"],
                });
                const unmatchedMasterIds = existingItems
                    .filter((i) => i.master_id && !csvMasterIds.includes(i.master_id))
                    .map((i) => i.master_id);
                if (unmatchedMasterIds.length > 0) {
                    // Delete in batches
                    for (let i = 0; i < unmatchedMasterIds.length; i += EtlController.BATCH_SIZE) {
                        const batch = unmatchedMasterIds.slice(i, i + EtlController.BATCH_SIZE);
                        yield orderItemRepo.delete({ master_id: (0, typeorm_1.In)(batch) });
                        console.log(`Deleted ${batch.length} unmatched order items`);
                    }
                }
                yield queryRunner.commitTransaction();
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.error("Error removing unmatched items", error);
                throw error;
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    /**
     * Update order item quantities with error handling
     */
    static updateOrderItemQty() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            yield queryRunner.connect();
            try {
                yield queryRunner.startTransaction();
                const orderItemRepo = queryRunner.manager.getRepository(order_items_1.OrderItem);
                const orderItemsFilePath = path_1.default.join(EtlController.publicPath, "order_items.csv");
                if (!fs_1.default.existsSync(orderItemsFilePath)) {
                    console.warn("Order items CSV not found, skipping quantity updates");
                    return;
                }
                const records = yield EtlController.readCsv(orderItemsFilePath);
                // Handle case when CSV is empty or has only header
                if (records.length <= 1) {
                    console.log("No order items to update");
                    return;
                }
                const updates = [];
                for (const row of records.slice(1)) {
                    if (!row || row.length < 6)
                        continue;
                    const master_id = (_a = row[0]) === null || _a === void 0 ? void 0 : _a.toString().trim();
                    if (!master_id)
                        continue;
                    const qty = parseInt(row[3]);
                    if (isNaN(qty))
                        continue;
                    const qtyDelivered = parseInt(row[5]);
                    updates.push({
                        master_id,
                        qty,
                        remark_de: ((_b = row[4]) === null || _b === void 0 ? void 0 : _b.toString().substring(0, 500)) || "",
                        qty_delivered: isNaN(qtyDelivered) ? 0 : qtyDelivered,
                        qty_label: qty,
                    });
                }
                // Update in batches
                for (let i = 0; i < updates.length; i += EtlController.BATCH_SIZE) {
                    const batch = updates.slice(i, i + EtlController.BATCH_SIZE);
                    yield Promise.allSettled(batch.map((update) => orderItemRepo.update({ master_id: update.master_id }, {
                        qty: update.qty,
                        remark_de: update.remark_de,
                        qty_delivered: update.qty_delivered,
                        qty_label: update.qty_label,
                    })));
                }
                yield queryRunner.commitTransaction();
                console.log(`Updated ${updates.length} order items`);
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.error("Error updating order item quantities", error);
                throw error;
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    /**
     * Helper: Read CSV file with error handling
     */
    static readCsv(filePath) {
        return new Promise((resolve, reject) => {
            const records = [];
            if (!fs_1.default.existsSync(filePath)) {
                return resolve([]);
            }
            const parser = (0, csv_parse_1.parse)({
                delimiter: ",",
                relax_column_count: true,
                skip_empty_lines: true,
                trim: true,
            });
            fs_1.default.createReadStream(filePath)
                .pipe(parser)
                .on("data", (data) => records.push(data))
                .on("end", () => {
                console.log(`CSV loaded: ${path_1.default.basename(filePath)}`, {
                    rows: records.length,
                });
                resolve(records);
            })
                .on("error", (err) => {
                console.error(`Error reading CSV: ${path_1.default.basename(filePath)}`, err);
                reject(err);
            });
        });
    }
    // Placeholder methods for backward compatibility
    static whareHouseSync(req, res, next) {
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
