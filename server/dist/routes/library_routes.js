"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/library.routes.ts
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const library_controller_1 = require("../controllers/library_controller");
const authorized_1 = require("../middlewares/authorized");
const router = express_1.default.Router();
// Configure multer for temporary file storage
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    },
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
});
router.use(authorized_1.authenticateUser);
router.post("/upload", upload.single("file"), library_controller_1.uploadFile);
router.get("/", library_controller_1.getFiles);
router.get("/stats", library_controller_1.getFileStats);
router.get("/:fileId", library_controller_1.getFileById);
router.patch("/:fileId", library_controller_1.updateFile);
router.delete("/:fileId", library_controller_1.deleteFile);
exports.default = router;
