import mongoose from "mongoose";

const uri = process.env.MONGODB_URI ||
  'mongodb+srv://tugumefarouk55_db_user:zSpkccIK8pHGirJR@cluster0.2ucsalv.mongodb.net/MediCare';

const options = {
  dbName: 'MediCare',
  tls: true,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

export const connectDB = async () => {
  try {
    await mongoose.connect(uri, options);
    console.log("✅ Connected to DB");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};