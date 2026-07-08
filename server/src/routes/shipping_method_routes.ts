import { Router } from "express";
import {
  getAllShippingMethods,
  getShippingMethodById,
  createShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
} from "../controllers/shipping_method_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = Router();

router.get("/", authenticateUser, getAllShippingMethods as any);
router.post("/", authenticateUser, createShippingMethod as any);
router.get("/:id", authenticateUser, getShippingMethodById as any);
router.put("/:id", authenticateUser, updateShippingMethod as any);
router.delete("/:id", authenticateUser, deleteShippingMethod as any);

export default router;
