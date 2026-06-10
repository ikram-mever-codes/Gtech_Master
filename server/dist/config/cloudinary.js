"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signCloudinaryPdfUrl = void 0;
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const signCloudinaryPdfUrl = (url) => {
    if (!url || !url.includes("cloudinary.com"))
        return url;
    try {
        let finalUrl = url;
        if (url.includes("/raw/upload/") && url.toLowerCase().endsWith(".pdf")) {
            finalUrl = url.replace("/raw/upload/", "/image/upload/");
        }
        return finalUrl;
    }
    catch (err) {
        return url;
    }
};
exports.signCloudinaryPdfUrl = signCloudinaryPdfUrl;
exports.default = cloudinary_1.v2;
