import { AppDataSource } from "../config/database";
import { Customer } from "../models/customers";
import { Item } from "../models/items";
import { Parent } from "../models/parents";
import { BusinessDetails } from "../models/business_details";

export const seedDatabase = async () => {
    try {
        console.log("🌱 Starting database seeding...");

        const customerRepository = AppDataSource.getRepository(Customer);
        const itemRepository = AppDataSource.getRepository(Item);
        const parentRepository = AppDataSource.getRepository(Parent);
        const businessDetailsRepository = AppDataSource.getRepository(BusinessDetails);

        // Check if data already exists
        const existingCustomers = await customerRepository.count();
        const existingItems = await itemRepository.count();

        if (existingCustomers > 0 && existingItems > 0) {
            console.log("✅ Database already has data. Skipping seed.");
            return;
        }

        // Seed Customers
        console.log("📦 Seeding customers...");
        const customers = [
            {
                companyName: "TechCorp",
                legalName: "TechCorp GmbH",
                email: "contact@techcorp.de",
                contactEmail: "contact@techcorp.de",
                contactPhoneNumber: "+49 30 12345678",
                stage: "business" as const,
            },
            {
                companyName: "InnovateLtd",
                legalName: "Innovate Ltd.",
                email: "info@innovate.com",
                contactEmail: "info@innovate.com",
                contactPhoneNumber: "+49 89 87654321",
                stage: "business" as const,
            },
            {
                companyName: "GlobalTrade",
                legalName: "Global Trade International",
                email: "sales@globaltrade.com",
                contactEmail: "sales@globaltrade.com",
                contactPhoneNumber: "+49 40 11223344",
                stage: "star_business" as const,
            },
            {
                companyName: "SmartDevices",
                legalName: "Smart Devices AG",
                email: "contact@smartdevices.de",
                contactEmail: "contact@smartdevices.de",
                contactPhoneNumber: "+49 69 99887766",
                stage: "star_customer" as const,
            },
            {
                companyName: "EuroSupply",
                legalName: "Euro Supply Chain GmbH",
                email: "info@eurosupply.eu",
                contactEmail: "info@eurosupply.eu",
                contactPhoneNumber: "+49 221 55667788",
                stage: "business" as const,
            },
        ];

        const savedCustomers = [];
        for (const customerData of customers) {
            const customer = customerRepository.create(customerData);

            // Create business details for each customer
            const businessDetails = businessDetailsRepository.create({
                businessSource: "Manual",
                address: `${customerData.companyName} Street 123`,
                city: "Berlin",
                country: "Germany",
                postalCode: "10115",
                website: `https://www.${customerData.companyName.toLowerCase()}.com`,
                isDeviceMaker: "Unsure",
                customer: customer,
            });

            customer.businessDetails = businessDetails;
            const saved = await customerRepository.save(customer);
            savedCustomers.push(saved);
            console.log(`  ✓ Created customer: ${saved.companyName}`);
        }

        // Seed Parent Items
        console.log("📦 Seeding parent items...");
        const parents = [
            {
                id: 1,
                de_no: "PAR-001",
                name_de: "Electronic Components",
                name_en: "Electronic Components",
                name_cn: "电子元件",
                is_active: "Y",
            },
            {
                id: 2,
                de_no: "PAR-002",
                name_de: "Mechanical Parts",
                name_en: "Mechanical Parts",
                name_cn: "机械零件",
                is_active: "Y",
            },
            {
                id: 3,
                de_no: "PAR-003",
                name_de: "Office Supplies",
                name_en: "Office Supplies",
                name_cn: "办公用品",
                is_active: "Y",
            },
        ];

        const savedParents = [];
        for (const parentData of parents) {
            const parent = parentRepository.create(parentData);
            const saved = await parentRepository.save(parent);
            savedParents.push(saved);
            console.log(`  ✓ Created parent: ${saved.name_de}`);
        }

        console.log("📦 Seeding items...");
        const items = [
            {
                parent_id: savedParents[0].id,
                ItemID_DE: 1001,
                parent_no_de: "PAR-001",
                item_name: "LED Light 5W",
                item_name_cn: "LED灯5W",
                model: "LED-5W-001",
                FOQ: 100,
                FSQ: 50,
                RMB_Price: 25.50,
                weight: 0.15,
                width: 5.0,
                height: 10.0,
                length: 5.0,
                isActive: "Y",
                is_new: "Y",
                remark: "Energy efficient LED light",
            },
            {
                parent_id: savedParents[0].id,
                ItemID_DE: 1002,
                parent_no_de: "PAR-001",
                item_name: "Resistor 10K Ohm",
                item_name_cn: "电阻10K欧姆",
                model: "RES-10K-001",
                FOQ: 1000,
                FSQ: 500,
                RMB_Price: 0.50,
                weight: 0.01,
                width: 0.5,
                height: 1.0,
                length: 0.5,
                isActive: "Y",
                is_new: "Y",
                remark: "Standard resistor",
            },
            {
                parent_id: savedParents[1].id,
                ItemID_DE: 2001,
                parent_no_de: "PAR-002",
                item_name: "Gear Motor 12V",
                item_name_cn: "齿轮电机12V",
                model: "GM-12V-001",
                FOQ: 50,
                FSQ: 25,
                RMB_Price: 150.00,
                weight: 0.80,
                width: 8.0,
                height: 12.0,
                length: 10.0,
                isActive: "Y",
                is_new: "Y",
                remark: "12V DC gear motor",
            },
            {
                parent_id: savedParents[1].id,
                ItemID_DE: 2002,
                parent_no_de: "PAR-002",
                item_name: "Bearing 608ZZ",
                item_name_cn: "轴承608ZZ",
                model: "BRG-608ZZ",
                FOQ: 200,
                FSQ: 100,
                RMB_Price: 5.00,
                weight: 0.05,
                width: 2.2,
                height: 0.7,
                length: 2.2,
                isActive: "Y",
                is_new: "Y",
                remark: "Standard ball bearing",
            },
            {
                parent_id: savedParents[2].id,
                ItemID_DE: 3001,
                parent_no_de: "PAR-003",
                item_name: "A4 Paper Pack",
                item_name_cn: "A4纸包",
                model: "PPR-A4-500",
                FOQ: 500,
                FSQ: 100,
                RMB_Price: 20.00,
                weight: 2.50,
                width: 21.0,
                height: 29.7,
                length: 5.0,
                isActive: "Y",
                is_new: "Y",
                remark: "500 sheets A4 paper",
            },
            {
                parent_id: savedParents[2].id,
                ItemID_DE: 3002,
                parent_no_de: "PAR-003",
                item_name: "Ballpoint Pen Blue",
                item_name_cn: "圆珠笔蓝色",
                model: "PEN-BP-BLU",
                FOQ: 1000,
                FSQ: 500,
                RMB_Price: 1.50,
                weight: 0.01,
                width: 1.0,
                height: 14.0,
                length: 1.0,
                isActive: "Y",
                is_new: "Y",
                remark: "Standard blue ballpoint pen",
            },
            {
                parent_id: savedParents[0].id,
                ItemID_DE: 1003,
                parent_no_de: "PAR-001",
                item_name: "Capacitor 100uF",
                item_name_cn: "电容100uF",
                model: "CAP-100UF",
                FOQ: 500,
                FSQ: 250,
                RMB_Price: 2.00,
                weight: 0.02,
                width: 1.0,
                height: 2.0,
                length: 1.0,
                isActive: "Y",
                is_new: "Y",
                remark: "Electrolytic capacitor",
            },
            {
                parent_id: savedParents[1].id,
                ItemID_DE: 2003,
                parent_no_de: "PAR-002",
                item_name: "Spring Steel 5mm",
                item_name_cn: "弹簧钢5mm",
                model: "SPR-5MM-001",
                FOQ: 100,
                FSQ: 50,
                RMB_Price: 8.00,
                weight: 0.10,
                width: 0.5,
                height: 5.0,
                length: 10.0,
                isActive: "Y",
                is_new: "Y",
                remark: "Compression spring",
            },
        ];

        for (const itemData of items) {
            const item = itemRepository.create(itemData);
            const saved = await itemRepository.save(item);
            console.log(`  ✓ Created item: ${saved.item_name} (${saved.ItemID_DE})`);
        }

        console.log("✅ Database seeding completed successfully!");
        console.log(`   - ${savedCustomers.length} customers created`);
        console.log(`   - ${savedParents.length} parent items created`);
        console.log(`   - ${items.length} items created`);
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        throw error;
    }
};
