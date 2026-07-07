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
exports.seedDatabase = void 0;
const database_1 = require("../config/database");
const customers_1 = require("../models/customers");
const items_1 = require("../models/items");
const parents_1 = require("../models/parents");
const business_details_1 = require("../models/business_details");
const suppliers_1 = require("../models/suppliers");
const categories_1 = require("../models/categories");
const tax_profile_1 = require("../models/tax_profile");
const country_1 = require("../models/country");
const seedDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log("🌱 Starting database seeding...");
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const businessDetailsRepository = database_1.AppDataSource.getRepository(business_details_1.BusinessDetails);
        const supplierRepository = database_1.AppDataSource.getRepository(suppliers_1.Supplier);
        const categoryRepository = database_1.AppDataSource.getRepository(categories_1.Category);
        const taxProfileRepository = database_1.AppDataSource.getRepository(tax_profile_1.TaxProfile);
        const countryRepository = database_1.AppDataSource.getRepository(country_1.Country);
        const existingCountries = yield countryRepository.count();
        if (existingCountries === 0) {
            console.log("🌍 Seeding countries...");
            const countries = [
                { iso2: "DE", name: "Germany", name_de: "Deutschland", is_eu: true, is_igl_country: true },
                { iso2: "AT", name: "Austria", name_de: "Österreich", is_eu: true, is_igl_country: true },
                { iso2: "CH", name: "Switzerland", name_de: "Schweiz", is_eu: false, is_igl_country: false },
                { iso2: "US", name: "United States", name_de: "Vereinigte Staaten", is_eu: false, is_igl_country: false },
                { iso2: "CN", name: "China", name_de: "China", is_eu: false, is_igl_country: false },
                { iso2: "GB", name: "United Kingdom", name_de: "Vereinigtes Königreich", is_eu: false, is_igl_country: false },
                { iso2: "FR", name: "France", name_de: "Frankreich", is_eu: true, is_igl_country: false },
                { iso2: "IT", name: "Italy", name_de: "Italien", is_eu: true, is_igl_country: false },
                { iso2: "NL", name: "Netherlands", name_de: "Niederlande", is_eu: true, is_igl_country: false },
                { iso2: "PL", name: "Poland", name_de: "Polen", is_eu: true, is_igl_country: false },
                { iso2: "CZ", name: "Czech Republic", name_de: "Tschechische Republik", is_eu: true, is_igl_country: false },
                { iso2: "ES", name: "Spain", name_de: "Spanien", is_eu: true, is_igl_country: false },
                { iso2: "BE", name: "Belgium", name_de: "Belgien", is_eu: true, is_igl_country: false },
                { iso2: "HU", name: "Hungary", name_de: "Ungarn", is_eu: true, is_igl_country: false },
            ];
            for (const c of countries) {
                yield countryRepository.save(countryRepository.create(c));
            }
            console.log("  ✓ Seeded default countries");
        }
        const existingTaxProfiles = yield taxProfileRepository.count();
        if (existingTaxProfiles === 0) {
            console.log("📦 Seeding tax profiles...");
            const profiles = [
                {
                    name: "DE 19%",
                    tax_rate: 19.00,
                    tax_case: "DE-VAT",
                    tax_code: "DE-VAT19",
                    revenue_account_no: "8400",
                    description: "Standard German VAT rate (19%)",
                },
                {
                    name: "Reduced VAT (7%)",
                    tax_rate: 7.00,
                    tax_case: "DE-VAT",
                    tax_code: "DE-VAT7",
                    revenue_account_no: "8300",
                    description: "Reduced German VAT rate (7%)",
                },
                {
                    name: "AT IGL 0%",
                    tax_rate: 0.00,
                    tax_case: "EU_IGL",
                    tax_code: "AT-IGL0",
                    revenue_account_no: "8125",
                    requires_vat_id: true,
                    requires_confirmed_vat_id: true,
                    description: "Intra-EU business transactions to Austria (0%)",
                },
                {
                    name: "AT without valid VAT ID 19%",
                    tax_rate: 19.00,
                    tax_case: "EU_no_valid_VAT_ID",
                    tax_code: "AT-VAT19",
                    revenue_account_no: "8315",
                    description: "Transactions to Austria without valid VAT ID (19%)",
                },
                {
                    name: "CH Export 0%",
                    tax_rate: 0.00,
                    tax_case: "third_country",
                    tax_code: "CH-EXP0",
                    revenue_account_no: "8120",
                    description: "Export to Switzerland (0%)",
                },
                {
                    name: "VAT Free (Export to Third Countries)",
                    tax_rate: 0.00,
                    tax_case: "third_country",
                    tax_code: "DE-EXP0",
                    revenue_account_no: "8120",
                    description: "Export to non-EU countries (0%)",
                },
            ];
            for (const p of profiles) {
                yield taxProfileRepository.save(taxProfileRepository.create(p));
            }
            console.log("  ✓ Seeded default tax profiles");
        }
        const existingSuppliers = yield supplierRepository.count();
        if (existingSuppliers === 0) {
            console.log("📦 Seeding suppliers...");
            const suppliers = [
                {
                    name: "ElectroWorld",
                    company_name: "ElectroWorld Inc.",
                    name_cn: "电子世界",
                    email: "contact@electroworld.com",
                    order_type_id: 1,
                },
                {
                    name: "GlobalMech",
                    company_name: "Global Mechanics Ltd.",
                    name_cn: "全球机械",
                    email: "sales@globalmech.com",
                    order_type_id: 1,
                },
            ];
            for (const s of suppliers) {
                yield supplierRepository.save(supplierRepository.create(s));
            }
        }
        const existingCategories = yield categoryRepository.count();
        if (existingCategories === 0) {
            console.log("📦 Seeding categories...");
            const categories = [
                { name: "Electronics", de_cat: "ELEC", is_ignored_value: "N" },
                { name: "Mechanical", de_cat: "MECH", is_ignored_value: "N" },
                { name: "Office", de_cat: "OFFIC", is_ignored_value: "N" },
            ];
            for (const c of categories) {
                yield categoryRepository.save(categoryRepository.create(c));
            }
        }
        const existingCustomers = yield customerRepository.count();
        const existingItems = yield itemRepository.count();
        if (existingCustomers > 0 && existingItems > 0) {
            console.log("✅ Database already has customers/items. Skipping main seed.");
            return;
        }
        let savedSuppliers = [];
        if (existingSuppliers === 0) {
            console.log("📦 Seeding suppliers...");
            const suppliers = [
                {
                    name: "ElectroWorld",
                    company_name: "ElectroWorld Inc.",
                    name_cn: "电子世界",
                    email: "contact@electroworld.com",
                    order_type_id: 1,
                },
                {
                    name: "GlobalMech",
                    company_name: "Global Mechanics Ltd.",
                    name_cn: "全球机械",
                    email: "sales@globalmech.com",
                    order_type_id: 1,
                },
                {
                    name: "OfficeDepot",
                    company_name: "Office Depot GmbH",
                    name_cn: "办公仓库",
                    email: "info@officedepot.de",
                    order_type_id: 1,
                },
            ];
            for (const suppData of suppliers) {
                const supp = supplierRepository.create(suppData);
                const saved = yield supplierRepository.save(supp);
                savedSuppliers.push(saved);
                console.log(`  ✓ Created supplier: ${saved.company_name}`);
            }
        }
        let savedCategories = [];
        if (existingCategories === 0) {
            console.log("📦 Seeding categories...");
            const categories = [
                {
                    name: "Electronics",
                    de_cat: "ELEC",
                    is_ignored_value: "N",
                },
                {
                    name: "Mechanical",
                    de_cat: "MECH",
                    is_ignored_value: "N",
                },
                {
                    name: "Office",
                    de_cat: "OFFIC",
                    is_ignored_value: "N",
                },
                {
                    name: "Raw Materials",
                    de_cat: "MAT",
                    is_ignored_value: "N",
                },
                {
                    name: "Purchase Order",
                    de_cat: "PO",
                    is_ignored_value: "N",
                },
            ];
            for (const catData of categories) {
                const cat = categoryRepository.create(catData);
                const saved = yield categoryRepository.save(cat);
                savedCategories.push(saved);
                console.log(`  ✓ Created category: ${saved.name}`);
            }
        }
        if (existingCustomers === 0) {
            console.log("📦 Seeding customers...");
            const customers = [
                {
                    companyName: "TechCorp",
                    legalName: "TechCorp GmbH",
                    email: "contact@techcorp.de",
                    contactEmail: "contact@techcorp.de",
                    contactPhoneNumber: "+49 30 12345678",
                    stage: "business",
                },
                {
                    companyName: "InnovateLtd",
                    legalName: "Innovate Ltd.",
                    email: "info@innovate.com",
                    contactEmail: "info@innovate.com",
                    contactPhoneNumber: "+49 89 87654321",
                    stage: "business",
                },
                {
                    companyName: "GlobalTrade",
                    legalName: "Global Trade International",
                    email: "sales@globaltrade.com",
                    contactEmail: "sales@globaltrade.com",
                    contactPhoneNumber: "+49 40 11223344",
                    stage: "star_business",
                },
                {
                    companyName: "SmartDevices",
                    legalName: "Smart Devices AG",
                    email: "contact@smartdevices.de",
                    contactEmail: "contact@smartdevices.de",
                    contactPhoneNumber: "+49 69 99887766",
                    stage: "star_customer",
                },
                {
                    companyName: "EuroSupply",
                    legalName: "Euro Supply Chain GmbH",
                    email: "info@eurosupply.eu",
                    contactEmail: "info@eurosupply.eu",
                    contactPhoneNumber: "+49 221 55667788",
                    stage: "business",
                },
            ];
            const savedCustomers = [];
            for (const customerData of customers) {
                const customer = customerRepository.create(customerData);
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
                const saved = yield customerRepository.save(customer);
                console.log(`  ✓ Created customer: ${saved.companyName}`);
            }
        }
        if (existingItems === 0) {
            console.log("📦 Seeding parent items...");
        }
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
            const saved = yield parentRepository.save(parent);
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
            const saved = yield itemRepository.save(item);
            console.log(`  ✓ Created item: ${saved.item_name} (${saved.ItemID_DE})`);
        }
        console.log("🔗 Mapping existing businesses/customers to Country table...");
        const allCustomers = yield customerRepository.find({ relations: ["businessDetails"] });
        for (const customer of allCustomers) {
            const countryStr = (customer.country || ((_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.country) || "").trim().toUpperCase();
            if (countryStr) {
                const matchedCountry = yield countryRepository.findOne({
                    where: [
                        { iso2: countryStr },
                        { name: countryStr }
                    ]
                });
                if (matchedCountry) {
                    let updated = false;
                    if (customer.country_id !== matchedCountry.id) {
                        customer.country_id = matchedCountry.id;
                        yield customerRepository.save(customer);
                        updated = true;
                    }
                    if (customer.businessDetails && customer.businessDetails.country_id !== matchedCountry.id) {
                        customer.businessDetails.country_id = matchedCountry.id;
                        yield businessDetailsRepository.save(customer.businessDetails);
                        updated = true;
                    }
                    if (updated) {
                        console.log(`  ✓ Mapped business "${customer.companyName}" to country ${matchedCountry.name}`);
                    }
                }
                else {
                    console.log(`  ⚠ No country match found in DB for string "${countryStr}" (Business: ${customer.companyName})`);
                }
            }
        }
        console.log("✅ Database seeding completed successfully!");
    }
    catch (error) {
        console.error("❌ Error seeding database:", error);
        throw error;
    }
});
exports.seedDatabase = seedDatabase;
