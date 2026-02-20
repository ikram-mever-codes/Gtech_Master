"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cargo_controller_1 = require("../controllers/cargo_controller");
const authorized_1 = require("../middlewares/authorized");
const router = express_1.default.Router();
router.use(authorized_1.authenticateUser);
router.route("/").get(cargo_controller_1.getAllCargos).post(cargo_controller_1.createCargo);
router.route("/:id").get(cargo_controller_1.getCargoById).put(cargo_controller_1.updateCargo).delete(cargo_controller_1.deleteCargo);
router.route("/:id/orders").get(cargo_controller_1.getCargoOrders).post(cargo_controller_1.assignOrdersToCargo);
router.route("/:id/orders/:orderId").delete(cargo_controller_1.removeOrderFromCargo);
exports.default = router;
