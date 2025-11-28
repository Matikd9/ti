import type { ObjectId } from "mongodb";
import { getDetectionsCollection } from "@/lib/mongo";
import {
  mockDetections,
  normalizeDetection,
  type Detection,
  type DetectionPayload
} from "@/lib/detections";

const MAX_BUFFER = 200;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DetectionDocument = Detection & {
  _id?: ObjectId;
  createdAt: Date;
};

export async function GET() {
  try {
    const collection = await getDetectionsCollection();
    const docs = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(MAX_BUFFER)
      .toArray();

    const detections = docs.map(stripDocument);
    return Response.json({ detections, lastUpdate: detections[0]?.timestamp ?? null });
  } catch (error) {
    return Response.json(
      { ok: false, message: "No se pudo leer MongoDB", detail: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const items: DetectionPayload[] = Array.isArray(payload) ? payload : [payload];

    const normalized = items
      .filter((item) => typeof item.depth === "number" && Number.isFinite(item.depth))
      .map(normalizeDetection);

    if (!normalized.length) {
      return Response.json({ ok: false, message: "Sin mediciones válidas" }, { status: 400 });
    }

    const collection = await getDetectionsCollection();
    await collection.insertMany(
      normalized.map((item) => ({
        ...item,
        createdAt: new Date(item.timestamp)
      }))
    );

    return Response.json({ ok: true, stored: normalized.length });
  } catch (error) {
    return Response.json(
      { ok: false, message: "Error procesando el payload", detail: (error as Error).message },
      { status: 500 }
    );
  }
}

function stripDocument(document: DetectionDocument): Detection {
  const { _id, createdAt, ...rest } = document;
  return {
    ...rest,
    timestamp: rest.timestamp ?? createdAt.toISOString(),
    raw: rest.raw ?? `BACHE ${rest.depth.toFixed(2)}`
  };
}
