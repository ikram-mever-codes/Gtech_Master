import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";
import { User } from "../models/users";
import { Permission } from "../models/permissions";
import { hashSync } from "bcryptjs";
import { Customer } from "../models/customers";
import {
  CustomerCreator,
  List,
  ListCreator,
  ListItem,
  UserCreator,
} from "../models/list";
import { Invoice, InvoiceItem } from "../models/invoice";
import { Business } from "../models/bussiness";
import { StarBusinessDetails } from "../models/star_business_details";
import { StarCustomerDetails } from "../models/star_customer_details";
import { BusinessDetails } from "../models/business_details";
import { ContactPerson } from "../models/contact_person";
import { RequestedItem } from "../models/requested_items";
import { Parent } from "../models/parents";
import { Item } from "../models/items";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { Supplier } from "../models/suppliers";
import { SupplierItem } from "../models/supplier_items";
import { WarehouseItem } from "../models/warehouse_items";
import { VariationValue } from "../models/variation_values";
import { Taric } from "../models/tarics";
import { Category } from "../models/categories";
import { ItemQuality } from "../models/item_qualities";
import { LibraryFile } from "../models/library";
import { DeliveryAddress, Inquiry } from "../models/inquiry";
import { Offer, OfferLineItem } from "../models/offer";

dotenv.config();

export const AppDataSource = new DataSource({
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
    User,

    Customer,
    List,
    LibraryFile,
    ContactPerson,
    StarBusinessDetails,
    StarCustomerDetails,
    BusinessDetails,
    ListItem,
    ListCreator,
    Inquiry,
    DeliveryAddress,
    UserCreator,
    Business,
    RequestedItem,
    CustomerCreator,
    Permission,
    Invoice,
    InvoiceItem,
    DeliveryAddress,
    Parent,
    Item,
    Order,
    Offer,
    OfferLineItem,
    OrderItem,
    Supplier,
    SupplierItem,
    WarehouseItem,
    VariationValue,
    Taric,
    ItemQuality,
    Category,
  ],
  extra: {
    ssl:
      process.env.DB_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : false,
  },
  poolSize: 10,
});

export const initializeDatabase = async (): Promise<DataSource> => {
  try {
    await AppDataSource.initialize();
    console.log("Database connected successfully!");

    if (process.env.NODE_ENV === "development") {
      await AppDataSource.runMigrations();
      console.log("Migrations executed successfully");
    }

    return AppDataSource;
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};
