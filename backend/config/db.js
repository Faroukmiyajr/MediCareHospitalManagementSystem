import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://tugumefarouk55_db_user:zSpkccIK8pHGirJR@cluster0.2ucsalv.mongodb.net/MediCare');

    console.log("✅ Connected to DB");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1); // stops server if DB fails
  }
};