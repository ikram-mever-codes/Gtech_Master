import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";
import { User, UserRole } from "../models/users";
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
  password: process.env.DB_PASSWORD || "Mujtaba@911",
  database: process.env.DB_NAME || "master",
  synchronize: true,
  logging: false,

  entities: [
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

const bootstrapAdminUser = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) return;

  try {
    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({ where: { email } });

    if (existingUser) {
      let updated = false;
      if (existingUser.role !== UserRole.ADMIN) {
        existingUser.role = UserRole.ADMIN;
        updated = true;
      }
      if (!existingUser.isEmailVerified) {
        existingUser.isEmailVerified = true;
        updated = true;
      }
      if (updated) {
        await userRepository.save(existingUser);
      }
    } else {
      const hashedPassword = hashSync(password, 10);
      const newUser = userRepository.create({
        name: "Admin User",
        email,
        password: hashedPassword,
        role: UserRole.ADMIN,
        isEmailVerified: true,
      });
      await userRepository.save(newUser);
    }
  } catch (error) {
    console.error("Admin bootstrap error:", error);
  }
};

export const initializeDatabase = async (): Promise<DataSource> => {
  try {
    await AppDataSource.initialize();
    console.log("Database connected successfully!");

    if (process.env.NODE_ENV === "development") {
      await AppDataSource.runMigrations();
      console.log("Migrations executed successfully");
    }

    await bootstrapAdminUser();

    // Seed database with initial data
    const { seedDatabase } = await import("../services/seedDatabase");
    await seedDatabase();

    return AppDataSource;
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};
