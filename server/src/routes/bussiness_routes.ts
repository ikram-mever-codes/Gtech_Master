import { Router } from "express";
import {
  bulkImportBusinesses,
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  bulkDeleteBusinesses,
  searchBusinessesByLocation,
  getBusinessStatistics,
  bulkUpdateStatus,
} from "../controllers/bussiness_controller";
import { authenticateUser, isAdmin, authorize } from "../middlewares/authorized";
import { UserRole } from "../models/users";

const router: any = Router();

router.use(authenticateUser);

// Restricted to Admin and Sales
router.use(authorize(UserRole.SALES));

// Bulk operations
router.post("/bulk-import", bulkImportBusinesses);
router.post("/bulk-delete", isAdmin, bulkDeleteBusinesses);
router.post("/bulk-update-status", bulkUpdateStatus);

// CRUD operations
router.post("/", createBusiness);
router.get("/", getAllBusinesses);
router.get("/statistics", getBusinessStatistics);
router.get("/location-search", searchBusinessesByLocation);
router.get("/:id", getBusinessById);
router.put("/:id", updateBusiness);
router.delete("/:id", isAdmin, deleteBusiness);

export default router;
