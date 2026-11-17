import mongoose from 'mongoose';

/**
 * Cached MongoDB connection.
 * In development Next.js hot-reloads modules, and in serverless (Vercel) every
 * invocation may re-import this file. Keeping the connection on `global`
 * avoids opening a new connection for each request.
 */
let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.local.example to .env.local and add your connection string.'
    );
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 10000 })
      .then((m) => m)
      .catch((err) => {
        cached.promise = null; // allow a retry on the next request
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
