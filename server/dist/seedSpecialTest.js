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
const database_1 = require("./config/database");
const supplier_orders_1 = require("./models/supplier_orders");
const order_items_1 = require("./models/order_items");
const items_1 = require("./models/items");
const categories_1 = require("./models/categories");
const suppliers_1 = require("./models/suppliers");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield database_1.AppDataSource.initialize();
        let category = yield database_1.AppDataSource.getRepository(categories_1.Category).findOne({ where: { name: "Purchase Order" } });
        if (!category) {
            category = database_1.AppDataSource.getRepository(categories_1.Category).create({ name: "Purchase Order", de_cat: "PO", is_ignored_value: "N" });
            category = yield database_1.AppDataSource.getRepository(categories_1.Category).save(category);
        }
        let supplier = yield database_1.AppDataSource.getRepository(suppliers_1.Supplier).findOne({ where: {} });
        if (!supplier) {
            supplier = database_1.AppDataSource.getRepository(suppliers_1.Supplier).create({ company_name: "Test Supplier", name: "Test Supplier" });
            supplier = yield database_1.AppDataSource.getRepository(suppliers_1.Supplier).save(supplier);
        }
        let item = database_1.AppDataSource.getRepository(items_1.Item).create({
            item_name: "zain special item",
            ean: "8888888888888",
            is_new: "Y",
            isActive: "Y"
        });
        item = yield database_1.AppDataSource.getRepository(items_1.Item).save(item);
        let supplierOrder = database_1.AppDataSource.getRepository(supplier_orders_1.SupplierOrder).create({
            remark: "specialtest",
            order_type_id: category.id,
            supplier_id: supplier.id,
            is_po_created: 0,
            po_description: "Test PO Description",
        });
        supplierOrder = yield database_1.AppDataSource.getRepository(supplier_orders_1.SupplierOrder).save(supplierOrder);
        let orderItem = database_1.AppDataSource.getRepository(order_items_1.OrderItem).create({
            supplier_order_id: supplierOrder.id,
            item_id: item.id,
            qty: 5,
            price: 10,
            status: "SO",
        });
        yield database_1.AppDataSource.getRepository(order_items_1.OrderItem).save(orderItem);
        console.log("✅ Successfully seeded specialtest Supplier Order and zain special item!");
        process.exit(0);
    });
}
run().catch(err => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
