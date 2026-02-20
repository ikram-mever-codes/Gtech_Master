"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const errorMiddleware_1 = __importDefault(require("./middlewares/errorMiddleware"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const customer_routes_1 = __importDefault(require("./routes/customer_routes"));
const list_routes_1 = __importDefault(require("./routes/list_routes"));
const contact_routes_1 = __importDefault(require("./routes/contact_routes"));
const invoice_routes_1 = __importDefault(require("./routes/invoice_routes"));
const requested_item_routes_1 = __importDefault(require("./routes/requested_item_routes"));
const cronRoutes_1 = __importDefault(require("./routes/cronRoutes"));
const database_1 = require("./config/database");
const item_routes_1 = __importDefault(require("./routes/item_routes"));
const cronJob_1 = require("./services/cronJob");
const bussiness_routes_1 = __importDefault(require("./routes/bussiness_routes"));
const library_routes_1 = __importDefault(require("./routes/library_routes"));
const inquiry_routes_1 = __importDefault(require("./routes/inquiry_routes"));
const offer_routes_1 = __importDefault(require("./routes/offer_routes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const qtyRoutes_1 = __importDefault(require("./routes/qtyRoutes"));
const supplier_routes_1 = __importDefault(require("./routes/supplier_routes"));
const cargo_routes_1 = __importDefault(require("./routes/cargo_routes"));
const app = (0, express_1.default)();
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
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma", "Expires"],
};
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)(corsOptions));
app.use("/api/v1/auth", userRoutes_1.default);
app.use("/api/v1/contacts", contact_routes_1.default);
app.use("/api/v1/customers", customer_routes_1.default);
app.use("/api/v1/lists", list_routes_1.default);
app.use("/api/v1/invoices", invoice_routes_1.default);
app.use("/api/cron", cronRoutes_1.default);
app.use("/api/v1/businesses", bussiness_routes_1.default);
app.use("/api/v1/requested-items", requested_item_routes_1.default);
app.use("/api/v1/items", item_routes_1.default);
app.use("/api/v1/library", library_routes_1.default);
app.use("/api/v1/inquiries", inquiry_routes_1.default);
app.use("/api/v1/offers", offer_routes_1.default);
app.use("/api/v1/orders", orderRoutes_1.default);
app.use("/api/v1/categories", qtyRoutes_1.default);
app.use("/api/v1/suppliers", supplier_routes_1.default);
app.use("/api/v1/cargos", cargo_routes_1.default);
const __uploads_dirname = path_1.default.resolve();
app.use("/uploads", express_1.default.static(path_1.default.join(__uploads_dirname, "/uploads")));
app.use(errorMiddleware_1.default);
const initializeCronJobs = () => {
    const cronJobs = cronJob_1.CronJobs.getInstance();
    if (process.env.NODE_ENV === "production" ||
        process.env.ENABLE_CRON_JOBS === "true") {
        cronJobs.start();
        console.log("🚀 Cron jobs initialized and started");
    }
    else {
        console.log("⏹️ Cron jobs disabled in development mode");
    }
};
database_1.AppDataSource.initialize()
    .then(() => {
    console.log("📦 Database connected");
    initializeCronJobs();
})
    .catch((error) => console.log("Database connection error:", error));
// 404 Not Found handler
app.use((req, res, next) => {
    res.status(404).json({ message: "Resource Not Found!" });
});
app.get("/", (req, res) => {
    res.send("Hello from Express with TypeScript!");
});
exports.default = app;
