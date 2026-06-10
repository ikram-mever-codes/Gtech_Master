"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dashboard_controller_1 = require("../controllers/dashboard_controller");
const authorized_1 = require("../middlewares/authorized");
const router = express_1.default.Router();
router.get("/reports-control", authorized_1.authenticateUser, dashboard_controller_1.getAuditReports);
exports.default = router;
