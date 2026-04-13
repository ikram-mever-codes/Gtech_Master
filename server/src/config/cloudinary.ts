import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const signCloudinaryPdfUrl = (url: string) => {
  if (!url || !url.includes("cloudinary.com") || !url.toLowerCase().endsWith(".pdf")) return url;

  try {
    const isRaw = url.includes("/raw/upload/");
    const urlParts = url.split("/upload/");
    if (urlParts.length !== 2) return url;

    let publicId = urlParts[1];
    // Remove version (e.g. v1776065981/)
    const versionRegex = /^v\d+\//;
    if (versionRegex.test(publicId)) {
      publicId = publicId.replace(versionRegex, "");
    }

    return cloudinary.url(publicId, {
      secure: true,
      resource_type: isRaw ? "raw" : "image",
      sign_url: true,
    });
  } catch (err) {
    return url;
  }
};

export default cloudinary;
