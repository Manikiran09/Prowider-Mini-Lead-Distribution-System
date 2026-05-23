import mongoose from 'mongoose';

const mongodbUri = process.env.MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached = globalThis.mongooseCache ?? { conn: null, promise: null };

if (process.env.NODE_ENV !== 'production') {
  globalThis.mongooseCache = cached;
}

export async function connectMongo() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!mongodbUri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongodbUri, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
