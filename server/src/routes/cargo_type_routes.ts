import { Router } from "express";
import { authenticateUser } from "../middlewares/authorized";
import { createCargoType, getCargoTypes, getCargoTypeById, updateCargoType, deleteCargoType } from "../controllers/cargo_type_controller";

const router = Router();

router.route("/").post(authenticateUser as any, createCargoType as any).get(authenticateUser as any, getCargoTypes as any);
router.route("/:id").get(authenticateUser as any, getCargoTypeById as any).put(authenticateUser as any, updateCargoType as any).delete(authenticateUser as any, deleteCargoType as any);

export default router;
