import { AppDataSource } from "./config/database";
import { SupplierOrder } from "./models/supplier_orders";
import { OrderItem } from "./models/order_items";
import { Item } from "./models/items";
import { Category } from "./models/categories";
import { Supplier } from "./models/suppliers";
import dotenv from "dotenv";

dotenv.config();

async function run() {
    await AppDataSource.initialize();

    let category = await AppDataSource.getRepository(Category).findOne({ where: { name: "Purchase Order" } });
    if (!category) {
        category = AppDataSource.getRepository(Category).create({ name: "Purchase Order", de_cat: "PO", is_ignored_value: "N" });
        category = await AppDataSource.getRepository(Category).save(category);
    }

    let supplier = await AppDataSource.getRepository(Supplier).findOne({ where: {} });
    if (!supplier) {
        supplier = AppDataSource.getRepository(Supplier).create({ company_name: "Test Supplier", name: "Test Supplier" });
        supplier = await AppDataSource.getRepository(Supplier).save(supplier);
    }

    let item = AppDataSource.getRepository(Item).create({
        item_name: "zain special item",
        ean: "8888888888888",
        is_new: "Y",
        isActive: "Y"
    });
    item = await AppDataSource.getRepository(Item).save(item);

    let supplierOrder = AppDataSource.getRepository(SupplierOrder).create({
        remark: "specialtest",
        order_type_id: category.id,
        supplier_id: supplier.id,
        is_po_created: 0,
        po_description: "Test PO Description",
    });
    supplierOrder = await AppDataSource.getRepository(SupplierOrder).save(supplierOrder);

    let orderItem = AppDataSource.getRepository(OrderItem).create({
        supplier_order_id: supplierOrder.id,
        item_id: item.id,
        qty: 5,
        price: 10,
        status: "SO",
    });
    await AppDataSource.getRepository(OrderItem).save(orderItem);

    console.log("✅ Successfully seeded specialtest Supplier Order and zain special item!");
    process.exit(0);
}

run().catch(err => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
