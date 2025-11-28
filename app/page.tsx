"use client";

import { useEffect, useMemo, useState } from "react";
import {
  baselineDistanceCm,
  mockDetections,
  sensorNoiseCm,
  severityThresholds,
  type Detection,
  type Severity
} from "@/lib/detections";

const POLL_INTERVAL_MS = 1000;

const severityStyles: Record<Severity, { color: string; bg: string; helper: string }> = {
  Alta: {
    color: "text-rose-100",
    bg: "bg-rose-500/20",
    helper: `>${severityThresholds.high} cm respecto a ${baselineDistanceCm} cm`
  },
  Media: {
    color: "text-amber-100",
    bg: "bg-amber-500/20",
    helper: `${severityThresholds.medium} - ${severityThresholds.high} cm`
  },
  Baja: { color: "text-emerald-100", bg: "bg-emerald-500/20", helper: `< ${severityThresholds.medium} cm` }
};

type ConnectionState = "connecting" | "live" | "error";

type FeedResponse = {
  detections: Detection[];
  lastUpdate: string | null;
};

export default function Page() {
  const { detections, status, lastUpdate, error } = useDetectionFeed();
  const dataset = detections.length ? detections : mockDetections;

  const avgDepth = useMemo(() => averageDepth(dataset), [dataset]);
  const deepest = useMemo(() => maxDepth(dataset), [dataset]);
  const latest = dataset[0];
  const sparklineValues = useMemo(() => dataset.slice(0, 12).map((item) => item.depth).reverse(), [dataset]);

  return (
    <main className="min-h-screen">
      <div className="relative isolate overflow-hidden px-4 py-10 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 blur-3xl" aria-hidden>
          <div className="blur-ring absolute -top-32 left-16 h-64 w-64" />
          <div className="blur-ring absolute -bottom-16 right-10 h-52 w-52" />
        </div>

        <div className="mx-auto max-w-6xl space-y-8">
          <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 px-6 py-6 shadow-xl shadow-blue-900/30 backdrop-blur-md md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-200">Circuito real</p>
              <h1 className="text-3xl font-bold sm:text-4xl">Dashboard de detección con Arduino + HC-05</h1>
              <p className="max-w-2xl text-sm text-slate-300">
                Visualiza en vivo lo que emite tu sketch (<strong>BACHE &lt;profundidad&gt;</strong>) y valida la salud del enlace Bluetooth.
                El panel se alimenta con <code>/api/detections</code>, listo para que tu puente Node publique lecturas reales.
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                <span>
                  Última actualización:&nbsp;
                  <strong className="text-slate-100">{lastUpdate ? formatDate(lastUpdate) : "Sin datos"}</strong>
                </span>
                <LiveIndicator state={status} />
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <span className="badge bg-emerald-500/20 text-emerald-100">Listo para el HC-05</span>
              <span className="badge bg-sky-500/20 text-sky-100">9600 baud</span>
              {error ? <span className="badge bg-rose-500/20 text-rose-100">{error}</span> : null}
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Detecciones" value={dataset.length.toString()} sublabel="Lecturas recibidas" />
            <StatCard label="Graves" value={severityCount(dataset, "Alta").toString()} sublabel="> 3.5 cm" accent="bg-rose-500/20 text-rose-100" />
            <StatCard label="Moderadas" value={severityCount(dataset, "Media").toString()} sublabel="2 - 3.5 cm" accent="bg-amber-500/20 text-amber-100" />
            <StatCard label="Profundidad prom." value={`${avgDepth} cm`} sublabel={`Máx: ${deepest} cm`} />
          </section>

          <section className="grid gap-6 lg:grid-cols-5">
            <div className="card-surface col-span-3 rounded-3xl p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Lecturas parseadas</h2>
                  <p className="text-xs text-slate-400">Consumidas desde tu puente serial o pegadas manualmente</p>
                </div>
                <span className="badge bg-white/10 text-xs text-slate-100">Endpoint: GET /api/detections</span>
              </div>
              <div className="mt-4 grid gap-4 rounded-2xl border border-white/5 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Detección más reciente</p>
                  <p className="text-2xl font-semibold text-white">{latest?.depth.toFixed(2)} cm</p>
                  <p className="text-xs text-slate-400">{latest ? formatDate(latest.timestamp) : "Sin registro"}</p>
                </div>
                <div className="sm:col-span-2">
                  <Sparkline values={sparklineValues} />
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/5">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5 text-left text-slate-200">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Severidad</th>
                      <th className="px-4 py-3">Profundidad</th>
                      <th className="px-4 py-3">Ubicación</th>
                      <th className="px-4 py-3">Hora</th>
                      <th className="px-4 py-3">Fuente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {dataset.map((item) => (
                      <tr key={item.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-semibold text-slate-50">{item.id}</td>
                        <td className="px-4 py-3">
                          <SeverityBadge level={item.severity as Severity} />
                        </td>
                        <td className="px-4 py-3">{item.depth.toFixed(2)} cm</td>
                        <td className="px-4 py-3 text-slate-300">{item.location}</td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(item.timestamp)}</td>
                        <td className="px-4 py-3 text-slate-300">{item.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                El feed se actualiza cada 5 segundos. Tu script Node puede mandar <code>POST /api/detections</code> con un objeto o arreglo para alimentar esta tabla.
              </p>
            </div>

            <div className="col-span-2 space-y-6">
              <div className="card-surface rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Estado de conexión</h3>
                  <span className="badge bg-white/10 text-xs text-slate-100">HC-05 / USB</span>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  <ConnectionRow label="Puerto" value="/dev/rfcomm0 o COMx" />
                  <ConnectionRow label="Baudrate" value="9600" />
                  <ConnectionRow label="Formato" value="BACHE &lt;profundidad&gt;" />
                  <ConnectionRow label="Parser" value="serialport + Readline" />
                  <ConnectionRow label="Blueman" value="SetUp > Connect to Serial" />
                  <ConnectionRow label="Bridge" value="POST /api/detections" />
                  <ConnectionRow label="Destino DB" value="MongoDB · detections" />
                </div>
                <div className="mt-5 space-y-2 text-xs text-slate-400">
                  <p>1) En Ubuntu abre Blueman → &ldquo;Set up new device&rdquo;, selecciona HC-05 (PIN 1234).</p>
                  <p>2) Una vez emparejado, clic derecho → &ldquo;Connect to → Serial Port&rdquo; para obtener /dev/rfcommX.</p>
                  <p>3) Tu script Node lee ese puerto, envía POST /api/detections y MongoDB guarda la traza.</p>
                  <p>4) Configura tu sketch con distancia normal {baselineDistanceCm} cm y ruido ±{sensorNoiseCm} cm para que coincida con el panel.</p>
                  <p>5) El dashboard consulta Mongo cada segundo y muestra el histórico.</p>
                </div>
              </div>

              <div className="card-surface rounded-3xl p-6">
                <h3 className="text-lg font-semibold">Umbrales usados</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  {Object.entries(severityStyles).map(([key, style]) => (
                    <LegendRow key={key} color={style.bg.replace("/20", "")} label={key} helper={style.helper} />
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  Se asume una distancia normal de {baselineDistanceCm} cm y un ruido aceptable de ±{sensorNoiseCm} cm. Profundidades mayores a
                  {severityThresholds.high} cm respecto a esa referencia se marcan como &ldquo;Alta&rdquo;. Ajusta <code>distancia_normal</code> si tu maqueta difiere.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-5">
            <div className="card-surface col-span-3 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Log crudo (tal cual sale del monitor serie)</h3>
                <span className="badge bg-white/10 text-xs text-slate-100">Confirmación rápida</span>
              </div>
              <div className="mt-4 rounded-2xl border border-white/5 bg-black/40 p-4 font-mono text-sm text-slate-100">
                {dataset.map((item) => (
                  <div key={`${item.id}-raw`} className="flex items-center justify-between border-b border-white/5 py-2 last:border-none">
                    <span>{item.raw}</span>
                    <span className="text-xs text-slate-400">{formatDate(item.timestamp)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">Si el monitor serie imprime &quot;BACHE 3.4&quot;, se replica aquí.</p>
            </div>

            <div className="card-surface col-span-2 rounded-3xl p-6">
              <h3 className="text-lg font-semibold">Checklist de demo</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                <ChecklistRow label="HC-05 emparejado" helper="Luz roja parpadeo lento" state="ok" />
                <ChecklistRow label="Sensor calibrado" helper="Define distancia_normal" state="ok" />
                <ChecklistRow label="Puente Node corriendo" helper="Envía POST /api/detections" state={status === "live" ? "ok" : "warn"} />
                <ChecklistRow label="Dashboard abierto" helper="Verifica gráficas actualizando" state="ok" />
              </ul>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <HardwareGuide />
            <IntegrationCard
              title="Puente Node (USB o Bluetooth)"
              items={[
                "Instala serialport y crea un ReadlineParser a 9600 baudios.",
                "En Ubuntu usa Blueman para conectar el HC-05 al perfil Serial y ubicar /dev/rfcommX.",
                "Convierte cada línea en JSON { depth, severity, location }.",
                "Llama fetch('http://localhost:3000/api/detections', { method: 'POST', body: JSON.stringify(payload) }).",
                "Opcional: reenvía la misma trama a una API externa o base de datos."
              ]}
              footer="Esto desacopla el hardware del dashboard y te deja validar la data antes de guardarla."
            />
            <IntegrationCard
              title="¿Base de datos?"
              items={[
                "Recomendado si quieres históricos, comparativas o alertas.",
                "Opción ligera: SQLite/Postgres vía Prisma; nube: Supabase/Firebase.",
                "Esquema sugerido: detections(id, depth_cm, severity, location, source, created_at).",
                "Define MONGODB_URI y MONGODB_DB en .env.local para que el API persista datos.",
                "Guarda también la lectura cruda y la distancia base para recalibrar."
              ]}
              footer="Puedes empezar en memoria (endpoint actual) y migrar sin cambiar el front; solo apunta el puente Node a la nueva API."
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "medium",
    hour12: false
  }).format(new Date(value));
}

function averageDepth(data: Detection[]) {
  if (!data.length) return 0;
  const sum = data.reduce((total, item) => total + item.depth, 0);
  return +(sum / data.length).toFixed(1);
}

function severityCount(data: Detection[], level: Severity) {
  return data.filter((item) => item.severity === level).length;
}

function maxDepth(data: Detection[]) {
  if (!data.length) return 0;
  return Math.max(...data.map((item) => item.depth));
}

function SeverityBadge({ level, minimal = false }: { level: Severity; minimal?: boolean }) {
  const style = severityStyles[level];
  const label = level === "Alta" ? "Crítico" : level === "Media" ? "Moderado" : "Leve";

  return (
    <span className={`badge ${style.bg} ${style.color} ${minimal ? "text-[11px] px-2 py-1" : ""} border border-white/10`}>
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  accent
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent?: string;
}) {
  return (
    <div className="card-surface rounded-3xl p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-bold text-white">{value}</div>
        {accent ? <span className={`badge ${accent}`}>{sublabel}</span> : <span className="text-xs text-slate-400">{sublabel}</span>}
      </div>
    </div>
  );
}

function LegendRow({ color, label, helper }: { color: string; label: string; helper: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <div className="flex flex-1 items-center justify-between text-sm">
        <span className="font-medium text-slate-100">{label}</span>
        <span className="text-xs text-slate-400">{helper}</span>
      </div>
    </div>
  );
}

function ConnectionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
      <span className="text-slate-300">{label}</span>
      <span className="font-mono text-xs text-slate-100">{value}</span>
    </div>
  );
}

function ChecklistRow({
  label,
  helper,
  state
}: {
  label: string;
  helper: string;
  state: "ok" | "warn";
}) {
  const color = state === "ok" ? "bg-emerald-400" : "bg-amber-300";
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${color}`} />
      <div>
        <p className="font-semibold text-slate-50">{label}</p>
        <p className="text-slate-400">{helper}</p>
      </div>
    </li>
  );
}

function LiveIndicator({ state }: { state: ConnectionState }) {
  const map: Record<ConnectionState, { label: string; tone: string }> = {
    connecting: { label: "Sincronizando", tone: "bg-amber-400" },
    live: { label: "En vivo", tone: "bg-emerald-400" },
    error: { label: "Error de enlace", tone: "bg-rose-400" }
  };
  const { label, tone } = map[state];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs">
      <span className={`h-2 w-2 rounded-full ${tone} animate-pulse`} />
      {label}
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) {
    return <p className="text-xs text-slate-500">Aún no hay suficientes lecturas para graficar.</p>;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(max - min, 0.1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 20 - ((value - min) / span) * 16;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tendencia (últimas 12)</p>
      <svg viewBox="0 0 100 24" className="mt-2 h-16 w-full" preserveAspectRatio="none">
        <polyline fill="none" stroke="rgba(125,211,252,0.8)" strokeWidth="2" points={points} />
      </svg>
    </div>
  );
}

function HardwareGuide() {
  const items = [
    "Alimenta el HC-05 con 5 V y nivela RX (divisor resistivo o adaptador).",
    "Trig del HC-SR04 al pin 9, Echo al pin 10 con divisor hacia el Arduino.",
    `Configura distancia_normal en ${baselineDistanceCm} cm y espera un ruido de ±${sensorNoiseCm} cm; descuenta esa referencia para obtener profundidad real.`,
    "Envía Serial.print(\"BACHE \"), la profundidad en cm y un salto de línea para cada evento."
  ];
  return (
    <IntegrationCard
      title="Guía rápida de hardware"
      items={items}
      footer="Con estos pasos el sketch queda listo para publicarse por Bluetooth o USB y el HC-05 transmite a 9600 bps."
    />
  );
}

function IntegrationCard({
  title,
  items,
  footer
}: {
  title: string;
  items: string[];
  footer?: string;
}) {
  return (
    <div className="card-surface rounded-3xl p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm text-slate-200">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
            <p>{item}</p>
          </li>
        ))}
      </ul>
      {footer ? <p className="mt-4 text-xs text-slate-400">{footer}</p> : null}
    </div>
  );
}

function useDetectionFeed() {
  const [detections, setDetections] = useState<Detection[]>(mockDetections);
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    const fetchFeed = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch("/api/detections", {
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const payload = (await response.json()) as FeedResponse;
        if (!active) return;
        setDetections(payload.detections ?? []);
        setLastUpdate(payload.lastUpdate ?? new Date().toISOString());
        setStatus("live");
        setError(null);
      } catch (err) {
        if (!active) return;
        setStatus("error");
        setError((err as Error).message);
      }
    };

    fetchFeed();
    const interval = setInterval(fetchFeed, POLL_INTERVAL_MS);

    return () => {
      active = false;
      controller?.abort();
      clearInterval(interval);
    };
  }, []);

  return { detections, status, lastUpdate, error };
}
