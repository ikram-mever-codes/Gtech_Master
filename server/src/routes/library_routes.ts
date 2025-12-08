// routes/library.routes.ts
import express from "express";
import multer from "multer";
import {
  uploadFile,
  getFiles,
  getFileById,
  deleteFile,
  updateFile,
  getFileStats,
} from "../controllers/library_controller";
import { authenticateUser } from "../middlewares/authorized";

const router: any = express.Router();

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

router.use(authenticateUser);

router.post("/upload", upload.single("file"), uploadFile);

router.get("/", getFiles);

router.get("/stats", getFileStats);

router.get("/:fileId", getFileById);

router.patch("/:fileId", updateFile);

router.delete("/:fileId", deleteFile);

export default router;
