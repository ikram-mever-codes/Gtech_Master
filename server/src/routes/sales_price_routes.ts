import { Router } from "express";
import { SalesPriceController } from "../controllers/sales_price_controller";
import { authenticateUser } from "../middlewares/authorized";

const router: any = Router();
const controller = new SalesPriceController();

router.use(authenticateUser);

router.get("/resolve", controller.resolvePrice.bind(controller));
router.get("/item/:itemId", controller.getForItem.bind(controller));
router.post("", controller.create.bind(controller));
router.put("/:id", controller.update.bind(controller));
router.delete("/:id", controller.delete.bind(controller));

export default router;
