import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const signCloudinaryPdfUrl = (url: string) => {
  if (!url || !url.includes("cloudinary.com")) return url;

  try {
    let finalUrl = url;

    if (url.includes("/raw/upload/") && url.toLowerCase().endsWith(".pdf")) {
      finalUrl = url.replace("/raw/upload/", "/image/upload/");
    }
    if (finalUrl.includes("/s--") && finalUrl.includes("--/")) {
      const reg = /\/s--[a-zA-Z0-9_-]+--\//;
      finalUrl = finalUrl.replace(reg, "/");
    }

    return finalUrl;
  } catch (err) {
    return url;
  }
};

export default cloudinary;
