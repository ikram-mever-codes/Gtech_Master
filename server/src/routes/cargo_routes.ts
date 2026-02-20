import express from "express";
import {
    getAllCargos,
    getCargoById,
    createCargo,
    updateCargo,
    deleteCargo,
    assignOrdersToCargo,
    removeOrderFromCargo,
    getCargoOrders,
} from "../controllers/cargo_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = express.Router();

router.use(authenticateUser);

router.route("/").get(getAllCargos).post(createCargo);
router.route("/:id").get(getCargoById).put(updateCargo).delete(deleteCargo);
router.route("/:id/orders").get(getCargoOrders).post(assignOrdersToCargo);
router.route("/:id/orders/:orderId").delete(removeOrderFromCargo);

export default router;
