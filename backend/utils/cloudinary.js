import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

// Function to upload an image to Cloudinary
export async function uploadToCloudinary(filePath, folder = "Doctor") {
  try {
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary credentials are not configured");
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "image",
    });

    fs.unlinkSync(filePath);
    return result;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error?.message || error);
    throw error;
  }
}

// Function to delete an image from Cloudinary
export async function deleteFromCloudinary(publicId) {
    try {
        if (!publicId) return;
        await cloudinary.uploader.destroy(publicId);
        
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        throw error;
    }
}

export default cloudinary;