"use client";

import { useMemo } from "react";

// Lecturas reales de ejemplo copiadas directamente del monitor serie (o del puente Node). Cada
// línea corresponde a un "BACHE <profundidad>" enviado por el Arduino; puedes reemplazar este
// arreglo pegando tus propias lecturas.
const detections = [
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

type Severity = "Alta" | "Media" | "Baja";
type Detection = (typeof detections)[number];

const severityStyles: Record<Severity, { color: string; bg: string; helper: string }> = {
  Alta: { color: "text-rose-100", bg: "bg-rose-500/20", helper: "> 3.5 cm" },
  Media: { color: "text-amber-100", bg: "bg-amber-500/20", helper: "2 - 3.5 cm" },
  Baja: { color: "text-emerald-100", bg: "bg-emerald-500/20", helper: "< 2 cm" }
};

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

export default function Page() {
  const avgDepth = useMemo(() => averageDepth(detections), []);
  const deepest = useMemo(() => maxDepth(detections), []);

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
              <h1 className="text-3xl font-bold sm:text-4xl">Panel de baches con datos del Arduino</h1>
              <p className="max-w-2xl text-sm text-slate-300">
                Este panel muestra lecturas reales provenientes del sketch de Arduino: cada vez que el sensor detecta un bache envía
                <strong> BACHE &lt;profundidad&gt; </strong> por Bluetooth o USB. Aquí puedes pegar tus lecturas o consumirlas desde tu
                puente local.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="badge bg-emerald-500/20 text-emerald-100">Listo para el HC-05</span>
              <span className="badge bg-sky-500/20 text-sky-100">9600 baud</span>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Detecciones" value={detections.length.toString()} sublabel="Lecturas recibidas" />
            <StatCard label="Graves" value={severityCount(detections, "Alta").toString()} sublabel="> 3.5 cm" accent="bg-rose-500/20 text-rose-100" />
            <StatCard label="Moderadas" value={severityCount(detections, "Media").toString()} sublabel="2 - 3.5 cm" accent="bg-amber-500/20 text-amber-100" />
            <StatCard label="Profundidad prom." value={`${avgDepth} cm`} sublabel={`Máx: ${deepest} cm`} />
          </section>

          <section className="grid gap-6 lg:grid-cols-5">
            <div className="card-surface col-span-3 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Lecturas parseadas</h2>
                <span className="badge bg-white/10 text-xs text-slate-100">De tu puerto serie</span>
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
                    {detections.map((item) => (
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
                Reemplaza el arreglo superior con tu salida real del puente Node/Serial. Cada fila corresponde a una línea "BACHE <profundidad>" que
                envía el Arduino cuando el sensor detecta un hueco.
              </p>
            </div>

            <div className="col-span-2 space-y-6">
              <div className="card-surface rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Estado de conexión</h3>
                  <span className="badge bg-white/10 text-xs text-slate-100">HC-05 / USB</span>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  <ConnectionRow label="Puerto" value="/dev/rfcomm0 (o COMx)" />
                  <ConnectionRow label="Baudrate" value="9600" />
                  <ConnectionRow label="Formato" value="Línea: 'BACHE <profundidad>'" />
                  <ConnectionRow label="Parser" value="serialport + ReadlineParser" />
                </div>
                <div className="mt-5 space-y-2 text-xs text-slate-400">
                  <p>1) Empareja el HC-05 y abre el puerto.</p>
                  <p>2) Corre el puente Node que loguea cada línea.</p>
                  <p>3) Copia/consume el JSON generado para poblar este panel.</p>
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
                  Estos umbrales coinciden con el sketch: severidad "Alta" se marca si la profundidad supera ~3.5 cm respecto a la referencia calibrada
                  en <code>distancia_normal</code>. Ajusta ambos valores si cambias la altura de la maqueta.
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
                {detections.map((item) => (
                  <div key={`${item.id}-raw`} className="flex items-center justify-between border-b border-white/5 py-2 last:border-none">
                    <span>{item.raw}</span>
                    <span className="text-xs text-slate-400">{formatDate(item.timestamp)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">Si el monitor serie imprime "BACHE 3.4", deberías verlo aquí.</p>
            </div>

            <div className="card-surface col-span-2 rounded-3xl p-6">
              <h3 className="text-lg font-semibold">Checklist de demo</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                <ChecklistRow label="HC-05 emparejado" helper="Luz roja parpadeo lento" state="ok" />
                <ChecklistRow label="Monitor serie a 9600" helper="Se leen 'Distancia' y 'BACHE'" state="ok" />
                <ChecklistRow label="Puente Node corriendo" helper="Imprime JSON en consola" state="warn" />
                <ChecklistRow label="Panel abierto en localhost:3000" helper="Recarga tras pegar lecturas" state="ok" />
              </ul>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function SeverityBadge({ level, minimal = false }: { level: Severity; minimal?: boolean }) {
  const style = severityStyles[level];
  const label = level === "Alta" ? "Crítico" : level === "Media" ? "Moderado" : "Leve";

  return (
    <span
      className={`badge ${style.bg} ${style.color} ${minimal ? "text-[11px] px-2 py-1" : ""} border border-white/10`}
    >
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
