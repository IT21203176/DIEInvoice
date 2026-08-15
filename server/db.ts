import mongoose from "mongoose";

let cached: typeof mongoose | null = null;

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (cached && mongoose.connection.readyState === 1) {
    return cached;
  }
  cached = await mongoose.connect(uri);
  return cached;
}
