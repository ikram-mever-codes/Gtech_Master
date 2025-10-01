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
    User,
    Customer,
    List,
    ListItem,
    ListCreator,
    UserCreator,
    Business,
    CustomerCreator,
    Permission,
    Invoice,
    InvoiceItem,
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

const createAdminUser = async () => {
  const adminConfig: any = {
    name: "Mr IKRAM",
    email: "admin@gmail.com",
    password: hashSync("admin123", 10),
    role: "ADMIN" as const,
    country: "Pakistan",
    isEmailVerified: true,
  };

  const userRepository = AppDataSource.getRepository(User);

  const existingAdmin = await userRepository.findOne({
    where: { email: adminConfig.email },
  });

  if (!existingAdmin) {
    const adminUser = userRepository.create(adminConfig);
    await userRepository.save(adminUser);
    console.log("Admin user created successfully!");
  } else {
    console.log("Admin user already exists");
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

    await createAdminUser();
    return AppDataSource;
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};
