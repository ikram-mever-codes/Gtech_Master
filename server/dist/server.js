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
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const misDb_1 = require("./config/misDb");
const errorHandler_1 = __importDefault(require("./utils/errorHandler"));
const PORT = process.env.PORT || 1000;
(0, database_1.initializeDatabase)();
function fetchItemData(itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = yield (0, misDb_1.getConnection)();
        try {
            // Fetch from items table
            const [itemRows] = yield connection.query(`
      SELECT i.*, os.cargo_id 
      FROM items i
      LEFT JOIN order_statuses os ON i.ItemID_DE = os.ItemID_DE
      WHERE i.id = ?
    `, [itemId]);
            if (!itemRows || itemRows.length === 0) {
                throw new errorHandler_1.default("Item not found in MIS database", 404);
            }
            const itemData = itemRows[0];
            let deliveryDates = [];
            if (itemData.cargo_id) {
                const [cargoRows] = yield connection.query(`
        SELECT pickup_date, dep_date 
        FROM cargos 
        WHERE id = ?
        `, [itemData.cargo_id]);
                if (cargoRows && cargoRows.length > 0) {
                    const cargoData = cargoRows[0];
                    deliveryDates = [cargoData.pickup_date, cargoData.dep_date].filter((date) => date !== null);
                }
            }
            return {
                articleName: itemData.item_name || "",
                articleNumber: itemData.ItemID_DE || "",
                quantity: itemData.FOQ || 0,
                weight: itemData.weight,
                dimensions: {
                    width: itemData.width,
                    height: itemData.height,
                    length: itemData.length,
                },
                deliveryDates,
            };
        }
        finally {
            connection.release();
        }
    });
}
app_1.default.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Server is running on port ${PORT}`);
    console.log(`WebSocket server is running`);
}));
