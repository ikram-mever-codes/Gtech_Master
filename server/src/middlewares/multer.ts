import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import errorHandler from "../utils/errorHandler";

const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, uploadDir); // Use the defined uploadDir
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const extname = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${extname}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Special handling for ICS files
  if (file.originalname.toLowerCase().endsWith(".ics")) {
    console.log("ICS file detected:", file.originalname);
    cb(null, true);
    return;
  }

  // Existing file type checks for other file types
  const allowedFileTypes =
    /pdf|docx?|xlsx?|txt|jpe?g|png|webp|zip|csv|mp4|mp3|avi|pptx?/;
  const mimeTypes =
    /application\/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document|vnd.ms-excel|vnd.openxmlformats-officedocument.spreadsheetml.sheet|octet-stream|zip|x-zip-compressed)|text\/plain|image\/(jpeg|png|webp)|video\/(mp4|avi)|audio\/mp3|text\/csv|application\/vnd.ms-powerpoint|application\/vnd.openxmlformats-officedocument.presentationml.presentation/;
  const extname = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  if (allowedFileTypes.test(extname.substring(1)) && mimeTypes.test(mimeType)) {
    cb(null, true);
  } else {
    const error = new errorHandler(
      `Invalid file type: ${mimeType}, ${extname}`,
      400
    );
    cb(error as unknown as null, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

export const uploadSingleFile = upload.single("file");
export const uploadMultipleFiles = upload.array("files", 5);
