import { Router } from "express";
import {
  getShippingAddresses,
  createShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
  setDefaultShippingAddress,
} from "../controllers/shipping_address_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = Router({ mergeParams: true });

router.get("/", authenticateUser, getShippingAddresses as any);
router.post("/", authenticateUser, createShippingAddress as any);
router.put("/:addressId", authenticateUser, updateShippingAddress as any);
router.delete("/:addressId", authenticateUser, deleteShippingAddress as any);
router.patch("/:addressId/default", authenticateUser, setDefaultShippingAddress as any);

export default router;
