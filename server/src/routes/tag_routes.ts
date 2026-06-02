import { Router } from "express";
import {
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
  syncEntityTags,
} from "../controllers/tag_controller";

const router = Router();

router.get("/", getAllTags as any);
router.post("/", createTag as any);
router.put("/:id", updateTag as any);
router.delete("/:id", deleteTag as any);

router.post("/sync", syncEntityTags as any);

export default router;
