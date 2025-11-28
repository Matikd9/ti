import { MongoClient, type Collection } from "mongodb";
import type { Detection } from "@/lib/detections";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;
const options = {};

function getClientPromise() {
  if (!uri) {
    throw new Error("Define la variable de entorno MONGODB_URI para usar el dashboard con MongoDB");
  }

  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = new MongoClient(uri, options).connect();
  }

  return globalThis._mongoClientPromise;
}

export type DetectionDocument = Detection & {
  createdAt: Date;
  raw?: string;
};

export async function getDetectionsCollection(): Promise<Collection<DetectionDocument>> {
  const client = await getClientPromise();
  const dbName = process.env.MONGODB_DB ?? "ti";
  return client.db(dbName).collection<DetectionDocument>("detections");
}
