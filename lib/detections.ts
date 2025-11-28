export type Severity = "Alta" | "Media" | "Baja";

export type Detection = {
  id: string;
  depth: number;
  severity: Severity;
  timestamp: string;
  location: string;
  raw: string;
  vehicle: string;
  source: string;
};

export type DetectionPayload = Partial<Omit<Detection, "depth" | "severity">> & {
  depth: number;
  severity?: Severity;
};

export const baselineDistanceCm = 8.5;
export const sensorNoiseCm = 3;

export const severityThresholds = {
  medium: sensorNoiseCm,
  high: sensorNoiseCm * 2
};

export function inferSeverity(depth: number): Severity {
  if (depth >= severityThresholds.high) return "Alta";
  if (depth >= severityThresholds.medium) return "Media";
  return "Baja";
}

export function generateDetectionId() {
  return globalThis.crypto?.randomUUID?.() ?? `run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeDetection(item: DetectionPayload): Detection {
  const depth = Number(item.depth ?? 0);
  const sanitizedDepth = Number.isFinite(depth) ? +depth.toFixed(2) : 0;
  const timestamp = item.timestamp ?? new Date().toISOString();
  return {
    id: item.id ?? generateDetectionId(),
    depth: sanitizedDepth,
    severity: item.severity ?? inferSeverity(sanitizedDepth),
    timestamp,
    location: item.location ?? "Trayecto sin etiquetar",
    raw: item.raw ?? `BACHE ${sanitizedDepth.toFixed(2)}`,
    vehicle: item.vehicle ?? "Vehículo demo",
    source: item.source ?? "HC-05"
  };
}

export const mockDetections: Detection[] = [
  {
    id: "run-001",
    depth: 3.9,
    severity: "Alta",
    timestamp: "2024-05-12T15:04:22Z",
    location: "Caja de pruebas - carril A",
    raw: "BACHE 3.90",
    vehicle: "Auto demo",
    source: "HC-05"
  },
  {
    id: "run-002",
    depth: 2.4,
    severity: "Media",
    timestamp: "2024-05-12T15:03:58Z",
    location: "Caja de pruebas - carril B",
    raw: "BACHE 2.40",
    vehicle: "Auto demo",
    source: "HC-05"
  },
  {
    id: "run-003",
    depth: 4.6,
    severity: "Alta",
    timestamp: "2024-05-12T15:03:13Z",
    location: "Caja de pruebas - carril A",
    raw: "BACHE 4.60",
    vehicle: "Auto demo",
    source: "HC-05"
  },
  {
    id: "run-004",
    depth: 1.4,
    severity: "Baja",
    timestamp: "2024-05-12T15:02:41Z",
    location: "Sección plana (control)",
    raw: "BACHE 1.40",
    vehicle: "Auto demo",
    source: "USB"
  },
  {
    id: "run-005",
    depth: 2.1,
    severity: "Media",
    timestamp: "2024-05-12T15:02:05Z",
    location: "Caja de pruebas - carril C",
    raw: "BACHE 2.10",
    vehicle: "Auto demo",
    source: "USB"
  }
];
