import express, { Application, NextFunction, Request, Response } from "express";
import errorMiddleware from "./middlewares/errorMiddleware";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes";
import customerRoutes from "./routes/customer_routes";
import listRoutes from "./routes/list_routes";
import invoiceRoutes from "./routes/invoice_routes";
const app: any = express();

// Cors Setup
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
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/lists", listRoutes);
app.use("/api/v1/invoices", invoiceRoutes);

// Configuring the Uploads Dir

const __uploads_dirname = path.resolve();
app.use("/uploads", express.static(path.join(__uploads_dirname, "/uploads")));

app.use(errorMiddleware);

// 404 Not Found handler

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: "Resource Not Found!" });
});

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from Express with TypeScript!");
});

export default app;
