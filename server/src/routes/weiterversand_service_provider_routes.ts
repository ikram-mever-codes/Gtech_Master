import express from "express";
import {
  getAllWeiterversandServiceProviders,
  getWeiterversandServiceProviderById,
  createWeiterversandServiceProvider,
  updateWeiterversandServiceProvider,
  deleteWeiterversandServiceProvider,
} from "../controllers/weiterversand_service_provider_controller";

const router: any = express.Router();

router.get("/", getAllWeiterversandServiceProviders as any);
router.get("/:id", getWeiterversandServiceProviderById as any);
router.post("/", createWeiterversandServiceProvider as any);
router.put("/:id", updateWeiterversandServiceProvider as any);
router.delete("/:id", deleteWeiterversandServiceProvider as any);

export default router;