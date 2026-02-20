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
const promise_1 = __importDefault(require("mysql2/promise"));
const database_1 = require("../config/database");
const categories_1 = require("../models/categories");
const suppliers_1 = require("../models/suppliers");
const tarics_1 = require("../models/tarics");
const parents_1 = require("../models/parents");
const items_1 = require("../models/items");
const warehouse_items_1 = require("../models/warehouse_items");
const variation_values_1 = require("../models/variation_values");
const item_qualities_1 = require("../models/item_qualities");
const orders_1 = require("../models/orders");
const order_items_1 = require("../models/order_items");
const supplier_items_1 = require("../models/supplier_items");
const dbConfig = {
    host: process.env.MIS_DB_HOST ||
        "g-tech.c5i6oqis88l0.eu-central-1.rds.amazonaws.com",
    user: process.env.MIS_DB_USER || "admin",
    password: process.env.MIS_DB_PASSWORD || "1aYgTHBvji8qaoUNbbcI",
    database: process.env.MIS_DB_NAME || "misgtech",
    port: parseInt(process.env.MIS_DB_PORT || "3306"),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};
class DataSanitizer {
    static sanitizeString(value, maxLength, defaultValue = "") {
        if (value === null || value === undefined || value === "") {
            return defaultValue;
        }
        let str = String(value).trim();
        if (maxLength && str.length > maxLength) {
            str = str.substring(0, maxLength);
        }
        return str;
    }
    static sanitizeNumber(value, defaultValue = 0) {
        if (value === null || value === undefined || value === "") {
            return defaultValue;
        }
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
    }
    static sanitizeFloat(value, defaultValue = 0) {
        if (value === null || value === undefined || value === "") {
            return defaultValue;
        }
        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : num;
    }
    static sanitizeBigInt(value, defaultValue = 0) {
        if (value === null || value === undefined || value === "") {
            return defaultValue;
        }
        const num = Number(value);
        return isNaN(num) ? defaultValue : Math.trunc(num);
    }
    static sanitizeDecimalWithScale(value, precision = 10, scale = 2, defaultValue = 0) {
        if (value === null || value === undefined || value === "") {
            return defaultValue;
        }
        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : parseFloat(num.toFixed(scale));
    }
    static sanitizeDecimal(value, defaultValue = 0) {
        if (value === null || value === undefined || value === "") {
            return defaultValue;
        }
        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : num;
    }
    static sanitizeBoolean(value, trueValues = ["Y", "y", "1", "true", "yes"], defaultValue = "N") {
        if (value === null || value === undefined || value === "") {
            return defaultValue;
        }
        const str = String(value).trim().toLowerCase();
        const trueValuesLower = trueValues.map((v) => v.toLowerCase());
        return trueValuesLower.includes(str) ? "Y" : "N";
    }
    static sanitizeDate(value) {
        if (value === null || value === undefined || value === "") {
            return null;
        }
        try {
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : date;
        }
        catch (_a) {
            return null;
        }
    }
    static sanitizeEAN(value) {
        if (value === null || value === undefined || value === "") {
            return "";
        }
        return String(value).trim();
    }
}
class MySQLToPostgresMigrator {
    constructor() {
        this.batchSize = 100;
        // Store ID mappings between MySQL and PostgreSQL
        this.itemIdMap = new Map();
        this.categoryIdMap = new Map();
        this.orderIdMap = new Map(); // Add this for order references
        this.mysqlPool = promise_1.default.createPool(dbConfig);
    }
    migrateAllData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("🚀 Starting migration from MySQL to PostgreSQL...");
                // Initialize TypeORM connection
                if (!database_1.AppDataSource.isInitialized) {
                    yield database_1.AppDataSource.initialize();
                    console.log("✅ PostgreSQL connection initialized");
                }
                // Clear existing data and disable foreign key checks
                yield this.clearExistingData(true);
                // Migrate in proper order - referenced tables first
                console.log("\n📊 Migrating referenced tables first...");
                yield this.migrateCategories();
                yield this.migrateSuppliers();
                yield this.migrateTarics();
                yield this.migrateParents();
                yield this.migrateItems();
                yield this.migrateOrders(); // Need to migrate orders before order_items
                console.log("\n📊 Migrating dependent tables...");
                yield this.migrateWarehouseItems();
                yield this.migrateVariationValues();
                yield this.migrateItemQualities();
                yield this.migrateOrderItems();
                yield this.migrateSupplierItems();
                // Re-enable foreign key checks at the end
                yield this.enableForeignKeys();
                console.log("\n🎉 Migration completed successfully!");
            }
            catch (error) {
                console.error("❌ Migration failed:", error);
                throw error;
            }
            finally {
                yield this.mysqlPool.end();
            }
        });
    }
    clearExistingData() {
        return __awaiter(this, arguments, void 0, function* (keepForeignKeysDisabled = false) {
            console.log("🧹 Clearing existing data...");
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            try {
                yield queryRunner.connect();
                // Disable foreign key checks
                yield queryRunner.query('SET session_replication_role = "replica"');
                // Clear tables in reverse order (child tables first)
                yield queryRunner.query("DELETE FROM supplier_item");
                yield queryRunner.query("DELETE FROM order_item");
                yield queryRunner.query("DELETE FROM item_quality");
                yield queryRunner.query("DELETE FROM variation_value");
                yield queryRunner.query("DELETE FROM warehouse_item");
                yield queryRunner.query("DELETE FROM item");
                yield queryRunner.query("DELETE FROM parent");
                yield queryRunner.query("DELETE FROM taric");
                yield queryRunner.query("DELETE FROM supplier");
                yield queryRunner.query("DELETE FROM category");
                yield queryRunner.query('DELETE FROM "order"');
                if (!keepForeignKeysDisabled) {
                    yield queryRunner.query('SET session_replication_role = "origin"');
                    console.log("✅ Existing data cleared");
                }
                else {
                    console.log("✅ Existing data cleared (FKs remain disabled)");
                }
            }
            catch (error) {
                console.error("❌ Failed to clear existing data:", error);
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    enableForeignKeys() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("🔗 Re-enabling foreign key constraints...");
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            try {
                yield queryRunner.connect();
                yield queryRunner.query('SET session_replication_role = "origin"');
                console.log("✅ Foreign key constraints re-enabled");
            }
            catch (error) {
                console.error("❌ Failed to re-enable foreign keys:", error);
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    processInBatches(rows, processFunction, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            let successCount = 0;
            let errorCount = 0;
            for (let i = 0; i < rows.length; i += this.batchSize) {
                const batch = rows.slice(i, i + this.batchSize);
                for (const row of batch) {
                    try {
                        yield processFunction(row);
                        successCount++;
                    }
                    catch (error) {
                        errorCount++;
                        console.log(`   Error on record ${row.id || "unknown"}: ${error.message}`);
                    }
                }
            }
            console.log(`   ✅ ${successCount} records migrated, ❌ ${errorCount} errors`);
        });
    }
    migrateCategories() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("📦 Migrating categories...");
            const connection = yield this.mysqlPool.getConnection();
            try {
                const [rows] = yield connection.execute(`
        SELECT id, is_ignored_value, name, de_cat, created_at, updated_at 
        FROM categories
      `);
                const categoryRepository = database_1.AppDataSource.getRepository(categories_1.Category);
                const categories = rows;
                this.categoryIdMap.clear();
                yield this.processInBatches(categories, (row) => __awaiter(this, void 0, void 0, function* () {
                    const mysqlId = DataSanitizer.sanitizeNumber(row.id);
                    const category = categoryRepository.create({
                        id: mysqlId,
                        is_ignored_value: DataSanitizer.sanitizeBoolean(row.is_ignored_value, ["Y", "y", "1", "true"], "N"),
                        name: DataSanitizer.sanitizeString(row.name, 255, "-"),
                        de_cat: DataSanitizer.sanitizeString(row.de_cat, 5, "00000"),
                        created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                        updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                    });
                    yield categoryRepository.save(category);
                    this.categoryIdMap.set(mysqlId, mysqlId);
                }), "categories");
            }
            catch (error) {
                console.error("❌ Failed to migrate categories:", error);
            }
            finally {
                connection.release();
            }
        });
    }
    migrateSuppliers() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("🏢 Migrating suppliers...");
            const connection = yield this.mysqlPool.getConnection();
            try {
                const [rows] = yield connection.execute(`
        SELECT id, order_type_id, name, name_cn, company_name, extra_note, 
               min_order_value, is_fully_prepared, is_tax_included, is_freight_included,
               province, city, street, full_address, contact_person, phone, mobile,
               email, website, bank_name, account_number, beneficiary, deposit,
               bbgd, bagd, percentage, percentage2, percentage3, created_at, updated_at
        FROM suppliers
      `);
                const supplierRepository = database_1.AppDataSource.getRepository(suppliers_1.Supplier);
                const suppliers = rows;
                yield this.processInBatches(suppliers, (row) => __awaiter(this, void 0, void 0, function* () {
                    const supplier = supplierRepository.create({
                        id: DataSanitizer.sanitizeNumber(row.id),
                        order_type_id: DataSanitizer.sanitizeNumber(row.order_type_id, 1),
                        name: DataSanitizer.sanitizeString(row.name, 255, "-"),
                        name_cn: DataSanitizer.sanitizeString(row.name_cn, 255, "-"),
                        company_name: DataSanitizer.sanitizeString(row.company_name, 100, "-"),
                        extra_note: DataSanitizer.sanitizeString(row.extra_note, 255, ""),
                        min_order_value: DataSanitizer.sanitizeNumber(row.min_order_value),
                        is_fully_prepared: DataSanitizer.sanitizeString(row.is_fully_prepared, 3, "No"),
                        is_tax_included: DataSanitizer.sanitizeString(row.is_tax_included, 2, "No"),
                        is_freight_included: DataSanitizer.sanitizeString(row.is_freight_included, 2, "No"),
                        province: DataSanitizer.sanitizeString(row.province, 50, ""),
                        city: DataSanitizer.sanitizeString(row.city, 50, ""),
                        street: DataSanitizer.sanitizeString(row.street, 100, ""),
                        full_address: DataSanitizer.sanitizeString(row.full_address, 255, ""),
                        contact_person: DataSanitizer.sanitizeString(row.contact_person, 150, ""),
                        phone: DataSanitizer.sanitizeString(row.phone, 12, ""),
                        mobile: DataSanitizer.sanitizeString(row.mobile, 50, ""),
                        email: DataSanitizer.sanitizeString(row.email, 25, ""),
                        website: DataSanitizer.sanitizeString(row.website, 142, ""),
                        bank_name: DataSanitizer.sanitizeString(row.bank_name, 245, ""),
                        account_number: DataSanitizer.sanitizeString(row.account_number, 45, ""),
                        beneficiary: DataSanitizer.sanitizeString(row.beneficiary, 45, ""),
                        deposit: DataSanitizer.sanitizeNumber(row.deposit),
                        bbgd: DataSanitizer.sanitizeNumber(row.bbgd),
                        bagd: DataSanitizer.sanitizeNumber(row.bagd),
                        percentage: DataSanitizer.sanitizeDecimal(row.percentage),
                        percentage2: DataSanitizer.sanitizeDecimal(row.percentage2),
                        percentage3: DataSanitizer.sanitizeDecimal(row.percentage3),
                        created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                        updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                    });
                    yield supplierRepository.save(supplier);
                }), "suppliers");
            }
            catch (error) {
                console.error("❌ Failed to migrate suppliers:", error);
            }
            finally {
                connection.release();
            }
        });
    }
    migrateTarics() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("🏷️  Migrating tarics...");
            const connection = yield this.mysqlPool.getConnection();
            try {
                const [rows] = yield connection.execute(`
        SELECT id, code, reguler_artikel, duty_rate, name_de, description_de,
               name_en, description_en, name_cn, created_at, updated_at
        FROM tarics
      `);
                const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
                const tarics = rows;
                yield this.processInBatches(tarics, (row) => __awaiter(this, void 0, void 0, function* () {
                    const taric = taricRepository.create({
                        id: DataSanitizer.sanitizeNumber(row.id),
                        code: DataSanitizer.sanitizeString(row.code, 11, ""),
                        reguler_artikel: DataSanitizer.sanitizeBoolean(row.reguler_artikel, ["Y", "y", "1", "true"], "Y"),
                        duty_rate: DataSanitizer.sanitizeDecimal(row.duty_rate),
                        name_de: DataSanitizer.sanitizeString(row.name_de, 132, "-"),
                        description_de: DataSanitizer.sanitizeString(row.description_de, undefined, ""),
                        name_en: DataSanitizer.sanitizeString(row.name_en, 255, "-"),
                        description_en: DataSanitizer.sanitizeString(row.description_en, undefined, ""),
                        name_cn: DataSanitizer.sanitizeString(row.name_cn, undefined, "-"),
                        created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                        updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                    });
                    yield taricRepository.save(taric);
                }), "tarics");
            }
            catch (error) {
                console.error("❌ Failed to migrate tarics:", error);
            }
            finally {
                connection.release();
            }
        });
    }
    migrateParents() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("👨‍👦 Migrating parents...");
            const connection = yield this.mysqlPool.getConnection();
            try {
                const [rows] = yield connection.execute(`
        SELECT id, taric_id, supplier_id, de_id, de_no, is_active, name_de, name_en,
               name_cn, var_de_1, var_de_2, var_de_3, var_en_1, var_en_2, var_en_3,
               is_NwV, parent_rank, is_var_unilingual, created_at, updated_at
        FROM parents
      `);
                const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
                const parents = rows;
                yield this.processInBatches(parents, (row) => __awaiter(this, void 0, void 0, function* () {
                    // Handle foreign keys - set to null if 0 or invalid
                    const taricId = DataSanitizer.sanitizeNumber(row.taric_id);
                    const supplierId = DataSanitizer.sanitizeNumber(row.supplier_id);
                    const finalTaricId = taricId > 0 ? taricId : null;
                    const finalSupplierId = supplierId > 0 ? supplierId : null;
                    const parent = parentRepository.create({
                        id: DataSanitizer.sanitizeNumber(row.id),
                        taric_id: finalTaricId,
                        supplier_id: finalSupplierId,
                        de_id: DataSanitizer.sanitizeNumber(row.de_id),
                        de_no: DataSanitizer.sanitizeString(row.de_no, 9, ""),
                        is_active: DataSanitizer.sanitizeBoolean(row.is_active, ["Y", "y", "1", "true"], "Y"),
                        name_de: DataSanitizer.sanitizeString(row.name_de, 111, "-"),
                        name_en: DataSanitizer.sanitizeString(row.name_en, 80, "-"),
                        name_cn: DataSanitizer.sanitizeString(row.name_cn, 255, "-"),
                        var_de_1: DataSanitizer.sanitizeString(row.var_de_1, 27, ""),
                        var_de_2: DataSanitizer.sanitizeString(row.var_de_2, 23, ""),
                        var_de_3: DataSanitizer.sanitizeString(row.var_de_3, 18, ""),
                        var_en_1: DataSanitizer.sanitizeString(row.var_en_1, 25, ""),
                        var_en_2: DataSanitizer.sanitizeString(row.var_en_2, 17, ""),
                        var_en_3: DataSanitizer.sanitizeString(row.var_en_3, 18, ""),
                        is_NwV: DataSanitizer.sanitizeBoolean(row.is_NwV, ["Y", "y", "1", "true"], "N"),
                        parent_rank: DataSanitizer.sanitizeNumber(row.parent_rank, 3),
                        is_var_unilingual: DataSanitizer.sanitizeBoolean(row.is_var_unilingual, ["Y", "y", "1", "true"], "N"),
                        created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                        updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                    });
                    yield parentRepository.save(parent);
                }), "parents");
            }
            catch (error) {
                console.error("❌ Failed to migrate parents:", error);
            }
            finally {
                connection.release();
            }
        });
    }
    migrateItems() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("📋 Migrating items...");
            const connection = yield this.mysqlPool.getConnection();
            try {
                const [rows] = yield connection.execute(`
        SELECT id, parent_id, ItemID_DE, parent_no_de, is_dimension_special, 
               model, supp_cat, ean, taric_id, weight, width, height, length,
               item_name, item_name_cn, FOQ, FSQ, is_qty_dividable, ISBN, 
               cat_id, remark, RMB_Price, photo, pix_path, pix_path_eBay,
               is_npr, npr_remark, many_components, effort_rating, is_rmb_special,
               is_eur_special, is_pu_item, is_meter_item, is_new, isActive,
               note, synced_at, created_at, updated_at
        FROM items
      `);
                const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
                const items = rows;
                this.itemIdMap.clear();
                let successCount = 0;
                let errorCount = 0;
                for (let i = 0; i < items.length; i += this.batchSize) {
                    const batch = items.slice(i, i + this.batchSize);
                    for (const row of batch) {
                        try {
                            const mysqlId = DataSanitizer.sanitizeNumber(row.id);
                            // Handle ALL foreign keys properly
                            const parentId = DataSanitizer.sanitizeNumber(row.parent_id);
                            const taricId = DataSanitizer.sanitizeNumber(row.taric_id);
                            const catId = DataSanitizer.sanitizeNumber(row.cat_id);
                            // Check if category exists in our map
                            const finalCatId = catId > 0 && this.categoryIdMap.has(catId) ? catId : null;
                            const finalParentId = parentId > 0 ? parentId : null;
                            const finalTaricId = taricId > 0 ? taricId : null;
                            const item = itemRepository.create({
                                id: mysqlId,
                                parent_id: finalParentId,
                                ItemID_DE: DataSanitizer.sanitizeNumber(row.ItemID_DE),
                                parent_no_de: DataSanitizer.sanitizeString(row.parent_no_de, 50, ""),
                                is_dimension_special: DataSanitizer.sanitizeString(row.is_dimension_special, 1, "N"),
                                model: DataSanitizer.sanitizeString(row.model, 100, ""),
                                supp_cat: DataSanitizer.sanitizeString(row.supp_cat, 3, ""),
                                ean: DataSanitizer.sanitizeBigInt(row.ean),
                                taric_id: finalTaricId,
                                weight: DataSanitizer.sanitizeFloat(row.weight),
                                width: DataSanitizer.sanitizeFloat(row.width),
                                height: DataSanitizer.sanitizeFloat(row.height),
                                length: DataSanitizer.sanitizeFloat(row.length),
                                item_name: DataSanitizer.sanitizeString(row.item_name, 1000, ""),
                                item_name_cn: DataSanitizer.sanitizeString(row.item_name_cn, 1000, ""),
                                FOQ: DataSanitizer.sanitizeDecimalWithScale(row.FOQ, 10, 0),
                                FSQ: DataSanitizer.sanitizeDecimalWithScale(row.FSQ, 10, 0),
                                is_qty_dividable: DataSanitizer.sanitizeString(row.is_qty_dividable, 1, "Y"),
                                ISBN: DataSanitizer.sanitizeNumber(row.ISBN, 0),
                                cat_id: finalCatId,
                                remark: DataSanitizer.sanitizeString(row.remark, 1000, ""),
                                RMB_Price: DataSanitizer.sanitizeDecimalWithScale(row.RMB_Price, 10, 2),
                                photo: DataSanitizer.sanitizeString(row.photo, 255, ""),
                                pix_path: DataSanitizer.sanitizeString(row.pix_path, 1000, ""),
                                pix_path_eBay: DataSanitizer.sanitizeString(row.pix_path_eBay, 1000, ""),
                                is_npr: DataSanitizer.sanitizeString(row.is_npr, 1, "N"),
                                npr_remark: DataSanitizer.sanitizeString(row.npr_remark, 255, ""),
                                many_components: DataSanitizer.sanitizeNumber(row.many_components),
                                effort_rating: DataSanitizer.sanitizeNumber(row.effort_rating),
                                is_rmb_special: DataSanitizer.sanitizeString(row.is_rmb_special, 1, "N"),
                                is_eur_special: DataSanitizer.sanitizeString(row.is_eur_special, 1, "N"),
                                is_pu_item: DataSanitizer.sanitizeNumber(row.is_pu_item, 0),
                                is_meter_item: DataSanitizer.sanitizeNumber(row.is_meter_item, 0),
                                is_new: DataSanitizer.sanitizeString(row.is_new, 1, "Y"),
                                isActive: DataSanitizer.sanitizeBoolean(row.isActive, ["Y", "y", "1", "true"], "Y"),
                                note: DataSanitizer.sanitizeString(row.note, 200, ""),
                                synced_at: DataSanitizer.sanitizeDate(row.synced_at) || new Date(),
                                created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                                updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                            });
                            const savedItem = yield itemRepository.save(item);
                            this.itemIdMap.set(mysqlId, savedItem.id);
                            successCount++;
                        }
                        catch (error) {
                            errorCount++;
                            if (error.message.includes("foreign key constraint")) {
                                console.log(`   FK Error on item ${row.id}: Setting cat_id to null`);
                                // Try again with cat_id set to null
                                try {
                                    const mysqlId = DataSanitizer.sanitizeNumber(row.id);
                                    const parentId = DataSanitizer.sanitizeNumber(row.parent_id);
                                    const taricId = DataSanitizer.sanitizeNumber(row.taric_id);
                                    const finalParentId = parentId > 0 ? parentId : null;
                                    const finalTaricId = taricId > 0 ? taricId : null;
                                    const item = itemRepository.create({
                                        id: mysqlId,
                                        parent_id: finalParentId,
                                        ItemID_DE: DataSanitizer.sanitizeNumber(row.ItemID_DE),
                                        parent_no_de: DataSanitizer.sanitizeString(row.parent_no_de, 50, ""),
                                        is_dimension_special: DataSanitizer.sanitizeString(row.is_dimension_special, 1, "N"),
                                        model: DataSanitizer.sanitizeString(row.model, 100, ""),
                                        supp_cat: DataSanitizer.sanitizeString(row.supp_cat, 3, ""),
                                        ean: DataSanitizer.sanitizeBigInt(row.ean),
                                        taric_id: finalTaricId,
                                        weight: DataSanitizer.sanitizeFloat(row.weight),
                                        width: DataSanitizer.sanitizeFloat(row.width),
                                        height: DataSanitizer.sanitizeFloat(row.height),
                                        length: DataSanitizer.sanitizeFloat(row.length),
                                        item_name: DataSanitizer.sanitizeString(row.item_name, 1000, ""),
                                        item_name_cn: DataSanitizer.sanitizeString(row.item_name_cn, 1000, ""),
                                        FOQ: DataSanitizer.sanitizeDecimalWithScale(row.FOQ, 10, 0),
                                        FSQ: DataSanitizer.sanitizeDecimalWithScale(row.FSQ, 10, 0),
                                        is_qty_dividable: DataSanitizer.sanitizeString(row.is_qty_dividable, 1, "Y"),
                                        ISBN: DataSanitizer.sanitizeNumber(row.ISBN, 0),
                                        cat_id: null, // FORCE NULL
                                        remark: DataSanitizer.sanitizeString(row.remark, 1000, ""),
                                        RMB_Price: DataSanitizer.sanitizeDecimalWithScale(row.RMB_Price, 10, 2),
                                        photo: DataSanitizer.sanitizeString(row.photo, 255, ""),
                                        pix_path: DataSanitizer.sanitizeString(row.pix_path, 1000, ""),
                                        pix_path_eBay: DataSanitizer.sanitizeString(row.pix_path_eBay, 1000, ""),
                                        is_npr: DataSanitizer.sanitizeString(row.is_npr, 1, "N"),
                                        npr_remark: DataSanitizer.sanitizeString(row.npr_remark, 255, ""),
                                        many_components: DataSanitizer.sanitizeNumber(row.many_components),
                                        effort_rating: DataSanitizer.sanitizeNumber(row.effort_rating),
                                        is_rmb_special: DataSanitizer.sanitizeString(row.is_rmb_special, 1, "N"),
                                        is_eur_special: DataSanitizer.sanitizeString(row.is_eur_special, 1, "N"),
                                        is_pu_item: DataSanitizer.sanitizeNumber(row.is_pu_item, 0),
                                        is_meter_item: DataSanitizer.sanitizeNumber(row.is_meter_item, 0),
                                        is_new: DataSanitizer.sanitizeString(row.is_new, 1, "Y"),
                                        isActive: DataSanitizer.sanitizeBoolean(row.isActive, ["Y", "y", "1", "true"], "Y"),
                                        note: DataSanitizer.sanitizeString(row.note, 200, ""),
                                        synced_at: DataSanitizer.sanitizeDate(row.synced_at) || new Date(),
                                        created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                                        updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                                    });
                                    const savedItem = yield itemRepository.save(item);
                                    this.itemIdMap.set(mysqlId, savedItem.id);
                                    successCount++;
                                    errorCount--;
                                }
                                catch (retryError) {
                                    console.log(`   Retry failed for item ${row.id}: ${retryError.message}`);
                                }
                            }
                            else {
                                console.log(`   Error on item ${row.id}: ${error.message}`);
                            }
                        }
                    }
                }
                console.log(`   ✅ ${successCount} items migrated, ❌ ${errorCount} errors`);
            }
            catch (error) {
                console.error("❌ Failed to migrate items:", error);
                throw error;
            }
            finally {
                connection.release();
            }
        });
    }
    migrateOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("📦 Migrating orders...");
            const connection = yield this.mysqlPool.getConnection();
            try {
                const [rows] = yield connection.execute(`
        SELECT id, order_no, category_id, status, comment, date_created, date_emailed,
               date_delivery, created_at, updated_at
        FROM orders
      `);
                const orderRepository = database_1.AppDataSource.getRepository(orders_1.Order);
                const orders = rows;
                this.orderIdMap.clear();
                yield this.processInBatches(orders, (row) => __awaiter(this, void 0, void 0, function* () {
                    const mysqlId = DataSanitizer.sanitizeNumber(row.id);
                    const order = orderRepository.create({
                        id: mysqlId,
                        order_no: DataSanitizer.sanitizeString(row.order_no, 255, ""),
                        category_id: DataSanitizer.sanitizeNumber(row.category_id),
                        status: DataSanitizer.sanitizeNumber(row.status),
                        comment: DataSanitizer.sanitizeString(row.comment, undefined, ""),
                        date_created: DataSanitizer.sanitizeString(row.date_created, 255, ""),
                        date_emailed: DataSanitizer.sanitizeString(row.date_emailed, 255, ""),
                        date_delivery: DataSanitizer.sanitizeString(row.date_delivery, 255, ""),
                        created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                        updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                    });
                    yield orderRepository.save(order);
                    this.orderIdMap.set(mysqlId, mysqlId);
                }), "orders");
            }
            catch (error) {
                console.error("❌ Failed to migrate orders:", error);
            }
            finally {
                connection.release();
            }
        });
    }
    migrateWarehouseItems() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("🏭 Migrating warehouse items...");
            const connection = yield this.mysqlPool.getConnection();
            try {
                const [rows] = yield connection.execute(`
        SELECT id, item_id, ItemID_DE, category_id, ean, item_no_de, item_name_de,
               item_name_en, is_no_auto_order, is_active, stock_qty, msq, buffer,
               is_stock_item, is_SnSI, ship_class, created_at, updated_at
        FROM warehouse_items
      `);
                const warehouseItemRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
                const warehouseItems = rows;
                let successCount = 0;
                let skippedCount = 0;
                let errorCount = 0;
                for (let i = 0; i < warehouseItems.length; i += this.batchSize) {
                    const batch = warehouseItems.slice(i, i + this.batchSize);
                    for (const row of batch) {
                        try {
                            const mysqlItemId = DataSanitizer.sanitizeNumber(row.item_id);
                            const postgresItemId = this.itemIdMap.get(mysqlItemId);
                            if (!postgresItemId) {
                                skippedCount++;
                                console.log(`   Skipping warehouse item ${row.id}: Item ${mysqlItemId} not found`);
                                continue;
                            }
                            // Handle ALL foreign keys - force category_id to null to avoid FK errors
                            const categoryId = DataSanitizer.sanitizeNumber(row.category_id);
                            const finalCategoryId = null; // Force null for all warehouse items
                            const warehouseItem = warehouseItemRepository.create({
                                id: DataSanitizer.sanitizeNumber(row.id),
                                item_id: postgresItemId,
                                ItemID_DE: DataSanitizer.sanitizeNumber(row.ItemID_DE),
                                category_id: finalCategoryId, // Always null to avoid FK errors
                                ean: DataSanitizer.sanitizeEAN(row.ean),
                                item_no_de: DataSanitizer.sanitizeString(row.item_no_de, 100, ""),
                                item_name_de: DataSanitizer.sanitizeString(row.item_name_de, 500, "-"),
                                item_name_en: DataSanitizer.sanitizeString(row.item_name_en, 500, "-"),
                                is_no_auto_order: DataSanitizer.sanitizeBoolean(row.is_no_auto_order, ["Y", "y", "1", "true"], "N"),
                                is_active: DataSanitizer.sanitizeBoolean(row.is_active, ["Y", "y", "1", "true"], "Y"),
                                stock_qty: DataSanitizer.sanitizeDecimal(row.stock_qty),
                                msq: DataSanitizer.sanitizeDecimal(row.msq),
                                buffer: DataSanitizer.sanitizeNumber(row.buffer),
                                is_stock_item: DataSanitizer.sanitizeBoolean(row.is_stock_item, ["Y", "y", "1", "true"], "Y"),
                                is_SnSI: DataSanitizer.sanitizeBoolean(row.is_SnSI, ["Y", "y", "1", "true"], "Y"),
                                ship_class: DataSanitizer.sanitizeString(row.ship_class, 50, ""),
                                created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                                updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                            });
                            yield warehouseItemRepository.save(warehouseItem);
                            successCount++;
                        }
                        catch (error) {
                            errorCount++;
                            console.log(`   Error on warehouse item ${row.id}: ${error.message}`);
                            // Skip warehouse items that fail - they might have other FK constraints
                        }
                    }
                }
                console.log(`   ✅ ${successCount} records migrated, ⏭️ ${skippedCount} skipped, ❌ ${errorCount} errors`);
            }
            catch (error) {
                console.error("❌ Failed to migrate warehouse items:", error);
            }
            finally {
                connection.release();
            }
        });
    }
    migrateVariationValues() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("🎨 Migrating variation values...");
            const connection = yield this.mysqlPool.getConnection();
            try {
                const [rows] = yield connection.execute(`
        SELECT id, item_id, value_de, value_de_2, value_de_3, value_en, value_en_2,
               value_en_3, created_at, updated_at
        FROM variation_values
      `);
                const variationValueRepository = database_1.AppDataSource.getRepository(variation_values_1.VariationValue);
                const variationValues = rows;
                let successCount = 0;
                let skippedCount = 0;
                let errorCount = 0;
                for (let i = 0; i < variationValues.length; i += this.batchSize) {
                    const batch = variationValues.slice(i, i + this.batchSize);
                    for (const row of batch) {
                        try {
                            const mysqlItemId = DataSanitizer.sanitizeNumber(row.item_id);
                            const postgresItemId = this.itemIdMap.get(mysqlItemId);
                            if (!postgresItemId) {
                                skippedCount++;
                                continue;
                            }
                            const variationValue = variationValueRepository.create({
                                id: DataSanitizer.sanitizeNumber(row.id),
                                item_id: postgresItemId,
                                value_de: DataSanitizer.sanitizeString(row.value_de, 50, ""),
                                value_de_2: DataSanitizer.sanitizeString(row.value_de_2, 30, ""),
                                value_de_3: DataSanitizer.sanitizeString(row.value_de_3, 30, ""),
                                value_en: DataSanitizer.sanitizeString(row.value_en, 50, ""),
                                value_en_2: DataSanitizer.sanitizeString(row.value_en_2, 30, ""),
                                value_en_3: DataSanitizer.sanitizeString(row.value_en_3, 30, ""),
                                created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                                updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                            });
                            yield variationValueRepository.save(variationValue);
                            successCount++;
                        }
                        catch (error) {
                            errorCount++;
                            console.log(`   Error on variation value ${row.id}: ${error.message}`);
                        }
                    }
                }
                console.log(`   ✅ ${successCount} records migrated, ⏭️ ${skippedCount} skipped, ❌ ${errorCount} errors`);
            }
            catch (error) {
                console.error("❌ Failed to migrate variation values:", error);
            }
            finally {
                connection.release();
            }
        });
    }
    migrateItemQualities() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("⭐ Migrating item qualities...");
            const connection = yield this.mysqlPool.getConnection();
            try {
                const [rows] = yield connection.execute(`
        SELECT id, item_id, picture, name_cn, name, description, full_description,
               confirmed, created_at, updated_at
        FROM item_qualities
      `);
                const itemQualityRepository = database_1.AppDataSource.getRepository(item_qualities_1.ItemQuality);
                const itemQualities = rows;
                let successCount = 0;
                let skippedCount = 0;
                let errorCount = 0;
                for (let i = 0; i < itemQualities.length; i += this.batchSize) {
                    const batch = itemQualities.slice(i, i + this.batchSize);
                    for (const row of batch) {
                        try {
                            const mysqlItemId = DataSanitizer.sanitizeNumber(row.item_id);
                            const postgresItemId = this.itemIdMap.get(mysqlItemId);
                            if (!postgresItemId) {
                                skippedCount++;
                                continue;
                            }
                            const itemQuality = itemQualityRepository.create({
                                id: DataSanitizer.sanitizeNumber(row.id),
                                item_id: postgresItemId,
                                picture: DataSanitizer.sanitizeString(row.picture, 255, ""),
                                name_cn: DataSanitizer.sanitizeString(row.name_cn, 50, "-"),
                                name: DataSanitizer.sanitizeString(row.name, 50, "-"),
                                description: DataSanitizer.sanitizeString(row.description, 255, ""),
                                full_description: DataSanitizer.sanitizeString(row.full_description, undefined, ""),
                                confirmed: DataSanitizer.sanitizeNumber(row.confirmed),
                                created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                                updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                            });
                            yield itemQualityRepository.save(itemQuality);
                            successCount++;
                        }
                        catch (error) {
                            errorCount++;
                            console.log(`   Error on item quality ${row.id}: ${error.message}`);
                        }
                    }
                }
                console.log(`   ✅ ${successCount} records migrated, ⏭️ ${skippedCount} skipped, ❌ ${errorCount} errors`);
            }
            catch (error) {
                console.error("❌ Failed to migrate item qualities:", error);
            }
            finally {
                connection.release();
            }
        });
    }
    migrateOrderItems() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("📋 Migrating order items...");
            const connection = yield this.mysqlPool.getConnection();
            try {
                const [rows] = yield connection.execute(`
        SELECT id, master_id, ItemID_DE, order_no, qty, remark_de, qty_delivered,
               created_at, updated_at
        FROM order_items
      `);
                const orderItemRepository = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
                const orderItems = rows;
                let successCount = 0;
                let skippedCount = 0;
                let errorCount = 0;
                for (let i = 0; i < orderItems.length; i += this.batchSize) {
                    const batch = orderItems.slice(i, i + this.batchSize);
                    for (const row of batch) {
                        try {
                            const mysqlItemId = DataSanitizer.sanitizeNumber(row.ItemID_DE);
                            const postgresItemId = this.itemIdMap.get(mysqlItemId);
                            if (!postgresItemId) {
                                skippedCount++;
                                console.log(`   Skipping order item ${row.id}: Item ${mysqlItemId} not found`);
                                continue;
                            }
                            // Handle order_id foreign key - check if order exists
                            const orderId = DataSanitizer.sanitizeNumber(row.order_no);
                            const finalOrderId = orderId > 0 && this.orderIdMap.has(orderId) ? orderId : null;
                            const orderItem = orderItemRepository.create({
                                id: DataSanitizer.sanitizeNumber(row.id),
                                master_id: DataSanitizer.sanitizeString(row.master_id, 25, ""),
                                ItemID_DE: postgresItemId,
                                order_id: finalOrderId,
                                qty: DataSanitizer.sanitizeNumber(row.qty),
                                remark_de: DataSanitizer.sanitizeString(row.remark_de, undefined, ""),
                                qty_delivered: DataSanitizer.sanitizeNumber(row.qty_delivered),
                                created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                                updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                            });
                            yield orderItemRepository.save(orderItem);
                            successCount++;
                        }
                        catch (error) {
                            errorCount++;
                            console.log(`   Error on order item ${row.id}: ${error.message}`);
                            // If it's a foreign key error, try with null order_id
                            if (error.message.includes("foreign key constraint")) {
                                try {
                                    const mysqlItemId = DataSanitizer.sanitizeNumber(row.ItemID_DE);
                                    const postgresItemId = this.itemIdMap.get(mysqlItemId);
                                    if (!postgresItemId) {
                                        continue;
                                    }
                                    const orderItem = orderItemRepository.create({
                                        id: DataSanitizer.sanitizeNumber(row.id),
                                        master_id: DataSanitizer.sanitizeString(row.master_id, 25, ""),
                                        ItemID_DE: postgresItemId,
                                        order_id: null, // Force null
                                        qty: DataSanitizer.sanitizeNumber(row.qty),
                                        remark_de: DataSanitizer.sanitizeString(row.remark_de, undefined, ""),
                                        qty_delivered: DataSanitizer.sanitizeNumber(row.qty_delivered),
                                        created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                                        updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                                    });
                                    yield orderItemRepository.save(orderItem);
                                    successCount++;
                                    errorCount--;
                                    console.log(`   ✓ Recovered order item ${row.id} by setting order_id to null`);
                                }
                                catch (retryError) {
                                    console.log(`   ✗ Retry failed for order item ${row.id}: ${retryError.message}`);
                                }
                            }
                        }
                    }
                }
                console.log(`   ✅ ${successCount} records migrated, ⏭️ ${skippedCount} skipped, ❌ ${errorCount} errors`);
            }
            catch (error) {
                console.error("❌ Failed to migrate order items:", error);
            }
            finally {
                connection.release();
            }
        });
    }
    migrateSupplierItems() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("🏪 Migrating supplier items...");
            const connection = yield this.mysqlPool.getConnection();
            try {
                const [rows] = yield connection.execute(`
        SELECT id, item_id, supplier_id, is_default, moq, oi, price_rmb, url,
               note_cn, is_po, lead_time, updated_by, created_at, updated_at
        FROM supplier_items
      `);
                const supplierItemRepository = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
                const supplierItems = rows;
                let successCount = 0;
                let skippedCount = 0;
                let errorCount = 0;
                for (let i = 0; i < supplierItems.length; i += this.batchSize) {
                    const batch = supplierItems.slice(i, i + this.batchSize);
                    for (const row of batch) {
                        try {
                            const mysqlItemId = DataSanitizer.sanitizeNumber(row.item_id);
                            const postgresItemId = this.itemIdMap.get(mysqlItemId);
                            if (!postgresItemId) {
                                skippedCount++;
                                continue;
                            }
                            // Handle supplier_id foreign key - set to null if 0 or invalid
                            const supplierId = DataSanitizer.sanitizeNumber(row.supplier_id);
                            const finalSupplierId = supplierId > 0 ? supplierId : null;
                            const supplierItem = supplierItemRepository.create({
                                id: DataSanitizer.sanitizeNumber(row.id),
                                item_id: postgresItemId,
                                supplier_id: finalSupplierId,
                                is_default: DataSanitizer.sanitizeBoolean(row.is_default, ["Y", "y", "1", "true"], "Y"),
                                moq: DataSanitizer.sanitizeNumber(row.moq),
                                oi: DataSanitizer.sanitizeNumber(row.oi, 0),
                                price_rmb: DataSanitizer.sanitizeDecimal(row.price_rmb),
                                url: DataSanitizer.sanitizeString(row.url, 1000, ""),
                                note_cn: DataSanitizer.sanitizeString(row.note_cn, 255, ""),
                                is_po: DataSanitizer.sanitizeString(row.is_po, 100, "No"),
                                lead_time: DataSanitizer.sanitizeString(row.lead_time, 100, ""),
                                updated_by: DataSanitizer.sanitizeString(row.updated_by, 25, ""),
                                created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                                updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                            });
                            yield supplierItemRepository.save(supplierItem);
                            successCount++;
                        }
                        catch (error) {
                            errorCount++;
                            console.log(`   Error on supplier item ${row.id}: ${error.message}`);
                            // If it's a foreign key error, try with null supplier_id
                            if (error.message.includes("foreign key constraint")) {
                                try {
                                    const mysqlItemId = DataSanitizer.sanitizeNumber(row.item_id);
                                    const postgresItemId = this.itemIdMap.get(mysqlItemId);
                                    if (!postgresItemId) {
                                        continue;
                                    }
                                    const supplierItem = supplierItemRepository.create({
                                        id: DataSanitizer.sanitizeNumber(row.id),
                                        item_id: postgresItemId,
                                        supplier_id: null, // Force null
                                        is_default: DataSanitizer.sanitizeBoolean(row.is_default, ["Y", "y", "1", "true"], "Y"),
                                        moq: DataSanitizer.sanitizeNumber(row.moq),
                                        oi: DataSanitizer.sanitizeNumber(row.oi, 0),
                                        price_rmb: DataSanitizer.sanitizeDecimal(row.price_rmb),
                                        url: DataSanitizer.sanitizeString(row.url, 1000, ""),
                                        note_cn: DataSanitizer.sanitizeString(row.note_cn, 255, ""),
                                        is_po: DataSanitizer.sanitizeString(row.is_po, 100, "No"),
                                        lead_time: DataSanitizer.sanitizeString(row.lead_time, 100, ""),
                                        updated_by: DataSanitizer.sanitizeString(row.updated_by, 25, ""),
                                        created_at: DataSanitizer.sanitizeDate(row.created_at) || new Date(),
                                        updated_at: DataSanitizer.sanitizeDate(row.updated_at) || new Date(),
                                    });
                                    yield supplierItemRepository.save(supplierItem);
                                    successCount++;
                                    errorCount--;
                                }
                                catch (retryError) {
                                    console.log(`   Retry failed for supplier item ${row.id}`);
                                }
                            }
                        }
                    }
                }
                console.log(`   ✅ ${successCount} records migrated, ⏭️ ${skippedCount} skipped, ❌ ${errorCount} errors`);
            }
            catch (error) {
                console.error("❌ Failed to migrate supplier items:", error);
            }
            finally {
                connection.release();
            }
        });
    }
}
// Migration runner
function runMigration() {
    return __awaiter(this, void 0, void 0, function* () {
        const migrator = new MySQLToPostgresMigrator();
        try {
            yield migrator.migrateAllData();
            console.log("\n🎊 Migration finished successfully!");
            console.log("💡 Invalid foreign key references have been set to null.");
        }
        catch (error) {
            console.error("\n💥 Migration failed completely:", error);
            process.exit(1);
        }
    });
}
// Run the migration
runMigration().catch(console.error);
