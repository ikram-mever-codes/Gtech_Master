"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMultipleFiles = exports.uploadSingleFile = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const uploadDir = "uploads/";
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Use the defined uploadDir
    },
    filename: (req, file, cb) => {
        const extname = path_1.default.extname(file.originalname);
        cb(null, `${file.fieldname}-${Date.now()}${extname}`);
    },
});
const fileFilter = (req, file, cb) => {
    // Special handling for ICS files
    if (file.originalname.toLowerCase().endsWith(".ics")) {
        console.log("ICS file detected:", file.originalname);
        cb(null, true);
        return;
    }
    // Existing file type checks for other file types
    const allowedFileTypes = /pdf|docx?|xlsx?|txt|jpe?g|png|webp|zip|csv|mp4|mp3|avi|pptx?/;
    const mimeTypes = /application\/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document|vnd.ms-excel|vnd.openxmlformats-officedocument.spreadsheetml.sheet|octet-stream|zip|x-zip-compressed)|text\/plain|image\/(jpeg|png|webp)|video\/(mp4|avi)|audio\/mp3|text\/csv|application\/vnd.ms-powerpoint|application\/vnd.openxmlformats-officedocument.presentationml.presentation/;
    const extname = path_1.default.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;
    if (allowedFileTypes.test(extname.substring(1)) && mimeTypes.test(mimeType)) {
        cb(null, true);
    }
    else {
        const error = new errorHandler_1.default(`Invalid file type: ${mimeType}, ${extname}`, 400);
        cb(error, false);
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 },
});
exports.uploadSingleFile = upload.single("file");
exports.uploadMultipleFiles = upload.array("files", 5);
