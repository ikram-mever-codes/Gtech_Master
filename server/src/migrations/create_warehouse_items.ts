// src/migrations/create_warehouse_items.ts
// Run with: npx ts-node src/migrations/create_warehouse_items.ts
import { AppDataSource } from "../config/database";

const createWarehouseItemsTable = async () => {
    try {
        await AppDataSource.initialize();
        console.log("✅ Database connected");

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();

        // Check if table already exists
        const tableExists = await queryRunner.hasTable("warehouse_items");
        if (tableExists) {
            console.log("ℹ️  Table 'warehouse_items' already exists — skipping creation.");
            await queryRunner.release();
            await AppDataSource.destroy();
            return;
        }

        console.log("🔨 Creating 'warehouse_items' table...");

        await queryRunner.query(`
      CREATE TABLE warehouse_items (
        id            SERIAL PRIMARY KEY,
        item_id       INTEGER NOT NULL,
        "ItemID_DE"   INTEGER,
        category_id   INTEGER DEFAULT 1,
        ean           VARCHAR(13),
        item_no_de    VARCHAR(100),
        item_name_de  VARCHAR(500),
        item_name_en  VARCHAR(500),
        is_no_auto_order CHAR(1) NOT NULL DEFAULT 'N',
        is_active     CHAR(1) NOT NULL DEFAULT 'Y',
        stock_qty     DECIMAL(10, 2),
        msq           DECIMAL(10, 2),
        buffer        INTEGER,
        is_stock_item CHAR(1) NOT NULL DEFAULT 'Y',
        "is_SnSI"     CHAR(1) NOT NULL DEFAULT 'Y',
        ship_class    VARCHAR(50),
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

        console.log("✅ Table 'warehouse_items' created successfully!");

        await queryRunner.release();
        await AppDataSource.destroy();
    } catch (error) {
        console.error("❌ Migration failed:", error);
        await AppDataSource.destroy();
        process.exit(1);
    }
};

createWarehouseItemsTable();
