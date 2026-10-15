import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Cached on `global` so warm serverless instances (and dev hot reloads) reuse one connection
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

const OPTIONS = {
  bufferCommands: false,
  maxPoolSize: 10,                 // bounded pool; keeps you under Atlas connection limits
  minPoolSize: 0,                  // don't hold idle connections open
  maxIdleTimeMS: 30000,            // close connections idle for 30s
  serverSelectionTimeoutMS: 5000,  // fail fast if Atlas is unreachable (default is 30s)
  socketTimeoutMS: 20000,          // don't let a hung query hold the function open
};

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in .env - add your MongoDB Atlas connection string');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, OPTIONS)
      .then((m) => m)
      .catch((err) => {
        // Reset so the next request retries instead of reusing a rejected promise forever
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}