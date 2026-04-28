import { v2 as cloudinary } from "cloudinary";
import fs from "fs";


//config/cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to upload an image to Cloudinary
export async function uploadToCloudinary(filePath, folder="Doctor") {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
             folder,
             resource_type: "image" // Optional: specify a folder in Cloudinary
        });

        // Delete the local file after uploading
        fs.unlinkSync(filePath);
        return result;

    }

    catch (error) {
        console.error("Error uploading to Cloudinary:", err);
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