import express, { Application, NextFunction, Request, Response } from "express";
import errorMiddleware from "./middlewares/errorMiddleware";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes";
import customerRoutes from "./routes/customer_routes";
import listRoutes from "./routes/list_routes";
import contactRoutes from "./routes/contact_routes";
import invoiceRoutes from "./routes/invoice_routes";
import cronRoutes from "./routes/cronRoutes";
import { AppDataSource } from "./config/database";
import { CronJobs } from "./services/cronJob";
import bussinessRoutes from "./routes/bussiness_routes";
const app: any = express();

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "https://stars.gtech.de",
    "https://master.gtech.de",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

// Coniguring Api Routes

app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/contacts", contactRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/lists", listRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/v1/businesses", bussinessRoutes);

// Configuring the Uploads Dir

const __uploads_dirname = path.resolve();
app.use("/uploads", express.static(path.join(__uploads_dirname, "/uploads")));

app.use(errorMiddleware);

const initializeCronJobs = () => {
  const cronJobs = CronJobs.getInstance();

  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_CRON_JOBS === "true"
  ) {
    cronJobs.start();
    console.log("🚀 Cron jobs initialized and started");
  } else {
    console.log("⏹️ Cron jobs disabled in development mode");
  }
};

AppDataSource.initialize()
  .then(() => {
    console.log("📦 Database connected");
    initializeCronJobs();
  })
  .catch((error) => console.log("Database connection error:", error));

// 404 Not Found handler

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: "Resource Not Found!" });
});

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from Express with TypeScript!");
});

export default app;
