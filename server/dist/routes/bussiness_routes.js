"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bussiness_controller_1 = require("../controllers/bussiness_controller");
const authorized_1 = require("../middlewares/authorized");
const router = (0, express_1.Router)();
router.use(authorized_1.authenticateUser);
// Bulk operations
router.post("/bulk-import", bussiness_controller_1.bulkImportBusinesses);
router.post("/bulk-delete", authorized_1.isAdmin, bussiness_controller_1.bulkDeleteBusinesses);
router.post("/bulk-update-status", bussiness_controller_1.bulkUpdateStatus);
// CRUD operations
router.post("/", bussiness_controller_1.createBusiness);
router.get("/", bussiness_controller_1.getAllBusinesses);
router.get("/statistics", bussiness_controller_1.getBusinessStatistics);
router.get("/location-search", bussiness_controller_1.searchBusinessesByLocation);
router.get("/:id", bussiness_controller_1.getBusinessById);
router.put("/:id", bussiness_controller_1.updateBusiness);
router.delete("/:id", authorized_1.isAdmin, bussiness_controller_1.deleteBusiness);
exports.default = router;
