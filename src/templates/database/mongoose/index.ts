import mongoose from 'mongoose';

export async function connectDb() {
  await mongoose.connect(process.env.DATABASE_URL ?? 'mongodb://localhost:27017/app');
}
