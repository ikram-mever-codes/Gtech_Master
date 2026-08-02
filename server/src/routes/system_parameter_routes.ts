import { Router } from "express";
import {
  getAllSystemParameters,
  getSystemParameterByKey,
  updateSystemColours,
  checkColourInUse,
  uploadDocumentTemplate,
  restoreDocumentTemplate,
  deleteDocumentTemplate,
} from "../controllers/system_parameter_controller";
import { authenticateUser } from "../middlewares/authorized";
import { uploadSingleFile } from "../middlewares/multer";

const router = Router();

router.get("/", authenticateUser, getAllSystemParameters as any);
router.get("/:key", authenticateUser, getSystemParameterByKey as any);
router.put("/colours", authenticateUser, updateSystemColours as any);
router.post("/check-colour-in-use", authenticateUser, checkColourInUse as any);
router.post(
  "/upload-template",
  authenticateUser,
  uploadSingleFile,
  uploadDocumentTemplate as any
);
router.post("/restore-template", authenticateUser, restoreDocumentTemplate as any);
router.delete(
  "/template/:key",
  authenticateUser,
  deleteDocumentTemplate as any
);

export default router;
