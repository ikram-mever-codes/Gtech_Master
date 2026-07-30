import { AppDataSource } from "../config/database";

const createCCITables = async () => {
  try {
    await AppDataSource.initialize();
    console.log("Database connected for CCI Table creation");

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    const customerTableExists = await queryRunner.hasTable("cci_customer");
    if (!customerTableExists) {
      console.log("Creating 'cci_customer' table...");
      await queryRunner.query(`
        CREATE TABLE cci_customer (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          original_customer_id VARCHAR(255),
          company_name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          tax_number VARCHAR(100),
          bill_to_address TEXT,
          ship_to_address TEXT,
          city VARCHAR(100),
          country VARCHAR(100),
          phone VARCHAR(100),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log("✅ Table 'cci_customer' created!");
    } else {
      console.log("ℹ️ Table 'cci_customer' already exists.");
    }

    const invoiceTableExists = await queryRunner.hasTable("cci_invoice");
    if (!invoiceTableExists) {
      console.log("🔨 Creating 'cci_invoice' table...");
      await queryRunner.query(`
        CREATE TABLE cci_invoice (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_number VARCHAR(100) NOT NULL,
          order_number VARCHAR(100),
          cargo_no VARCHAR(100),
          invoice_date DATE NOT NULL,
          delivery_date DATE NOT NULL,
          due_date DATE,
          net_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          gross_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          freight_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          description VARCHAR(255),
          remark TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'closed',
          closed_at TIMESTAMP DEFAULT NOW(),
          cci_customer_id UUID REFERENCES cci_customer(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log("✅ Table 'cci_invoice' created!");
    } else {
      console.log("ℹ️ Table 'cci_invoice' already exists.");
    }

    const itemsTableExists = await queryRunner.hasTable("cci_items");
    if (!itemsTableExists) {
      console.log("🔨 Creating 'cci_items' table...");
      await queryRunner.query(`
        CREATE TABLE cci_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cci_invoice_id UUID NOT NULL REFERENCES cci_invoice(id) ON DELETE CASCADE,
          item_id INTEGER,
          ean VARCHAR(100),
          item_no_de VARCHAR(100),
          item_name VARCHAR(500) NOT NULL,
          taric_code VARCHAR(100),
          taric_name_en VARCHAR(500),
          duty_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          order_no VARCHAR(100),
          remark TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log("✅ Table 'cci_items' created!");
    } else {
      console.log("ℹ️ Table 'cci_items' already exists.");
    }

    await queryRunner.release();
    await AppDataSource.destroy();
    console.log("🎉 All CCI tables created successfully!");
  } catch (error) {
    console.error("❌ CCI Table creation migration failed:", error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
};

createCCITables();
