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
    if (!url || !url.includes("cloudinary.com") || !url.toLowerCase().endsWith(".pdf"))
        return url;
    try {
        const isRaw = url.includes("/raw/upload/");
        const urlParts = url.split("/upload/");
        if (urlParts.length !== 2)
            return url;
        let publicId = urlParts[1];
        // Remove version (e.g. v1776065981/)
        const versionRegex = /^v\d+\//;
        if (versionRegex.test(publicId)) {
            publicId = publicId.replace(versionRegex, "");
        }
        return cloudinary_1.v2.url(publicId, {
            secure: true,
            resource_type: isRaw ? "raw" : "image",
            sign_url: true,
        });
    }
    catch (err) {
        return url;
    }
};
exports.signCloudinaryPdfUrl = signCloudinaryPdfUrl;
exports.default = cloudinary_1.v2;
