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
Object.defineProperty(exports, "__esModule", { value: true });
// src/migrations/create_warehouse_items.ts
// Run with: npx ts-node src/migrations/create_warehouse_items.ts
const database_1 = require("../config/database");
const createWarehouseItemsTable = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield database_1.AppDataSource.initialize();
        console.log("✅ Database connected");
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        yield queryRunner.connect();
        // Check if table already exists
        const tableExists = yield queryRunner.hasTable("warehouse_items");
        if (tableExists) {
            console.log("ℹ️  Table 'warehouse_items' already exists — skipping creation.");
            yield queryRunner.release();
            yield database_1.AppDataSource.destroy();
            return;
        }
        console.log("🔨 Creating 'warehouse_items' table...");
        yield queryRunner.query(`
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
        yield queryRunner.release();
        yield database_1.AppDataSource.destroy();
    }
    catch (error) {
        console.error("❌ Migration failed:", error);
        yield database_1.AppDataSource.destroy();
        process.exit(1);
    }
});
createWarehouseItemsTable();
