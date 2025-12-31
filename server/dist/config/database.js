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
exports.initializeDatabase = exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const dotenv_1 = __importDefault(require("dotenv"));
const users_1 = require("../models/users");
const permissions_1 = require("../models/permissions");
const customers_1 = require("../models/customers");
const list_1 = require("../models/list");
const invoice_1 = require("../models/invoice");
const bussiness_1 = require("../models/bussiness");
const star_business_details_1 = require("../models/star_business_details");
const star_customer_details_1 = require("../models/star_customer_details");
const business_details_1 = require("../models/business_details");
const contact_person_1 = require("../models/contact_person");
const requested_items_1 = require("../models/requested_items");
const parents_1 = require("../models/parents");
const items_1 = require("../models/items");
const orders_1 = require("../models/orders");
const order_items_1 = require("../models/order_items");
const suppliers_1 = require("../models/suppliers");
const supplier_items_1 = require("../models/supplier_items");
const warehouse_items_1 = require("../models/warehouse_items");
const variation_values_1 = require("../models/variation_values");
const tarics_1 = require("../models/tarics");
const categories_1 = require("../models/categories");
const item_qualities_1 = require("../models/item_qualities");
const library_1 = require("../models/library");
const inquiry_1 = require("../models/inquiry");
const offer_1 = require("../models/offer");
dotenv_1.default.config();
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "qwerty",
    database: process.env.DB_NAME || "gtech_master",
    synchronize: true,
    logging: false,
    entities: [
        // EXISTING ENTITIES
        users_1.User,
        customers_1.Customer,
        list_1.List,
        library_1.LibraryFile,
        contact_person_1.ContactPerson,
        star_business_details_1.StarBusinessDetails,
        star_customer_details_1.StarCustomerDetails,
        business_details_1.BusinessDetails,
        list_1.ListItem,
        list_1.ListCreator,
        inquiry_1.Inquiry,
        inquiry_1.DeliveryAddress,
        list_1.UserCreator,
        bussiness_1.Business,
        requested_items_1.RequestedItem,
        list_1.CustomerCreator,
        permissions_1.Permission,
        invoice_1.Invoice,
        invoice_1.InvoiceItem,
        inquiry_1.DeliveryAddress,
        parents_1.Parent,
        items_1.Item,
        orders_1.Order,
        offer_1.Offer,
        offer_1.OfferLineItem,
        order_items_1.OrderItem,
        suppliers_1.Supplier,
        supplier_items_1.SupplierItem,
        warehouse_items_1.WarehouseItem,
        variation_values_1.VariationValue,
        tarics_1.Taric,
        item_qualities_1.ItemQuality,
        categories_1.Category,
    ],
    extra: {
        ssl: process.env.DB_SSL === "true"
            ? {
                rejectUnauthorized: false,
            }
            : false,
    },
    poolSize: 10,
});
const initializeDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.AppDataSource.initialize();
        console.log("Database connected successfully!");
        if (process.env.NODE_ENV === "development") {
            yield exports.AppDataSource.runMigrations();
            console.log("Migrations executed successfully");
        }
        return exports.AppDataSource;
    }
    catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
});
exports.initializeDatabase = initializeDatabase;
