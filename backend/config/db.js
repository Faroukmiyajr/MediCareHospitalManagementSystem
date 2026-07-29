import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medicare";
const options = {
  dbName: process.env.MONGODB_DB_NAME || "MediCare",
  tls: true,
  connectTimeoutMS: 15000,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: "majority",
  authSource: "admin",
};

export const connectDB = async () => {
  try {
    const resolvedUri = uri.includes("mongodb+srv")
      ? "mongodb://ac-wvyrfnq-shard-00-00.vb9mmky.mongodb.net:27017,ac-wvyrfnq-shard-00-01.vb9mmky.mongodb.net:27017,ac-wvyrfnq-shard-00-02.vb9mmky.mongodb.net:27017/medicare?replicaSet=atlas-1xhei0-shard-0"
      : uri;

    await mongoose.connect(resolvedUri, options);
    console.log("✅ Connected to DB");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
};