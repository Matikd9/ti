const detections = [
  {
    id: "MX-001",
    depth: 4.2,
    severity: "Alta",
    road: "Av. Reforma",
    timestamp: "2024-05-12T09:32:00Z",
    latitude: 19.4326,
    longitude: -99.1332,
    vehicle: "Unidad 3",
    note: "Seguido en recorridos matutinos"
  },
  {
    id: "MX-002",
    depth: 2.1,
    severity: "Media",
    road: "Calle 12",
    timestamp: "2024-05-12T09:28:00Z",
    latitude: 19.4289,
    longitude: -99.1379,
    vehicle: "Unidad 1",
    note: "Incrementó desde la semana pasada"
  },
  {
    id: "MX-003",
    depth: 3.5,
    severity: "Alta",
    road: "Eje Central",
    timestamp: "2024-05-12T09:25:00Z",
    latitude: 19.4354,
    longitude: -99.14,
    vehicle: "Unidad 2",
    note: "Cerca de crucero peatonal"
  },
  {
    id: "MX-004",
    depth: 1.2,
    severity: "Baja",
    road: "Callejón Sur",
    timestamp: "2024-05-12T09:20:00Z",
    latitude: 19.431,
    longitude: -99.129,
    vehicle: "Unidad 2",
    note: "Superficie irregular pero transitable"
  },
  {
    id: "MX-005",
    depth: 2.8,
    severity: "Media",
    road: "Av. Juárez",
    timestamp: "2024-05-12T09:14:00Z",
    latitude: 19.43,
    longitude: -99.132,
    vehicle: "Unidad 4",
    note: "Zona con alto flujo de camiones"
  },
  {
    id: "MX-006",
    depth: 5.1,
    severity: "Alta",
    road: "Retorno Norte",
    timestamp: "2024-05-12T09:07:00Z",
    latitude: 19.439,
    longitude: -99.125,
    vehicle: "Unidad 1",
    note: "Se recomienda cierre parcial"
  }
];

type Severity = "Alta" | "Media" | "Baja";
type Detection = (typeof detections)[number];

const severityStyles: Record<Severity, { color: string; bg: string }> = {
  Alta: { color: "text-rose-100", bg: "bg-rose-500/20" },
  Media: { color: "text-amber-100", bg: "bg-amber-500/20" },
  Baja: { color: "text-emerald-100", bg: "bg-emerald-500/20" }
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
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

function formatCoordinate(value: number) {
  return value.toFixed(4);
}

const weeklyTrend = [
  { label: "Lun", total: 3 },
  { label: "Mar", total: 5 },
  { label: "Mié", total: 4 },
  { label: "Jue", total: 6 },
  { label: "Vie", total: 3 },
  { label: "Sáb", total: 4 },
  { label: "Dom", total: 2 }
];

export default function Page() {
  const latest = detections.slice(0, 5);
  const avgDepth = averageDepth(detections);

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
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-200">MVP de detección</p>
              <h1 className="text-3xl font-bold sm:text-4xl">Panel en vivo de baches</h1>
              <p className="max-w-2xl text-sm text-slate-300">
                Visualiza las lecturas que envía el Arduino por Bluetooth, clasifica por severidad y prioriza reparaciones.
                Puedes correr este panel con <strong>Next.js</strong> y <strong>Tailwind CSS</strong> mientras simulas el recorrido del vehículo.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="badge bg-sky-500/20 text-sky-100">Tiempo real simulado</span>
              <span className="badge bg-emerald-500/20 text-emerald-100">Listo para demo</span>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Detecciones" value={detections.length.toString()} sublabel="Últimos 15 min" />
            <StatCard label="Graves" value={severityCount(detections, "Alta").toString()} sublabel="> 3.5 cm" accent="bg-rose-500/20 text-rose-100" />
            <StatCard label="Moderadas" value={severityCount(detections, "Media").toString()} sublabel="2 - 3.5 cm" accent="bg-amber-500/20 text-amber-100" />
            <StatCard label="Profundidad prom." value={`${avgDepth} cm`} sublabel="Promedio de la muestra" />
          </section>

          <section className="grid gap-6 lg:grid-cols-5">
            <div className="card-surface col-span-3 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Últimas detecciones</h2>
                <span className="badge bg-white/10 text-xs text-slate-100">Live feed</span>
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
                      <th className="px-4 py-3">Unidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {latest.map((item) => (
                      <tr key={item.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-semibold text-slate-50">{item.id}</td>
                        <td className="px-4 py-3">
                          <SeverityBadge level={item.severity as Severity} />
                        </td>
                        <td className="px-4 py-3">{item.depth.toFixed(1)} cm</td>
                        <td className="px-4 py-3 text-slate-300">
                          <div className="font-medium text-slate-100">{item.road}</div>
                          <div className="text-xs text-slate-400">
                            {formatCoordinate(item.latitude)} / {formatCoordinate(item.longitude)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(item.timestamp)}</td>
                        <td className="px-4 py-3 text-slate-300">{item.vehicle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Conecta tu HC-05 por Bluetooth, apunta a este panel y verás las lecturas reflejadas aquí en cuanto lleguen.
              </p>
            </div>

            <div className="col-span-2 space-y-6">
              <div className="card-surface rounded-3xl p-6">
                <h3 className="text-lg font-semibold">Severidad</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  <LegendRow color="bg-rose-500" label="Alta" helper="> 3.5 cm" />
                  <LegendRow color="bg-amber-400" label="Media" helper="2 - 3.5 cm" />
                  <LegendRow color="bg-emerald-400" label="Baja" helper="< 2 cm" />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm text-slate-300">
                  <SeverityChip label="Alta" value={severityCount(detections, "Alta")} color="bg-rose-500/15 text-rose-100" />
                  <SeverityChip label="Media" value={severityCount(detections, "Media")} color="bg-amber-400/15 text-amber-100" />
                  <SeverityChip label="Baja" value={severityCount(detections, "Baja")} color="bg-emerald-400/15 text-emerald-100" />
                </div>
              </div>

              <div className="card-surface rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Tendencia semanal</h3>
                  <span className="text-xs text-slate-400">Lecturas/día</span>
                </div>
                <div className="mt-5 grid grid-cols-7 gap-3">
                  {weeklyTrend.map((day) => (
                    <div key={day.label} className="flex flex-col items-center gap-2 text-xs text-slate-300">
                      <div className="flex h-24 w-full items-end rounded-full bg-white/5">
                        <div
                          className="w-full rounded-full bg-gradient-to-t from-sky-500 to-indigo-400"
                          style={{ height: `${Math.max(day.total * 12, 10)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-5">
            <div className="card-surface col-span-3 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Mapa rápido</h3>
                <span className="badge bg-white/10 text-xs text-slate-100">GPS simulado</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                {detections.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/5 bg-white/5 p-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{item.road}</span>
                      <SeverityBadge level={item.severity as Severity} minimal />
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-50">{item.depth.toFixed(1)} cm</div>
                    <div className="text-xs text-slate-400">
                      {formatCoordinate(item.latitude)} / {formatCoordinate(item.longitude)}
                    </div>
                    <div className="mt-1 text-xs text-sky-200">{item.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-surface col-span-2 rounded-3xl p-6">
              <h3 className="text-lg font-semibold">Checklist de demo</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <div>
                    <p className="font-semibold text-slate-50">Bluetooth conectado</p>
                    <p className="text-slate-400">Confirma el emparejamiento con el HC-05 (9600 baud).</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <div>
                    <p className="font-semibold text-slate-50">Lecturas en consola</p>
                    <p className="text-slate-400">Abre el puerto serial para validar la profundidad y umbrales.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <div>
                    <p className="font-semibold text-slate-50">Dashboard en pantalla</p>
                    <p className="text-slate-400">Usa este panel en modo fullscreen para el público.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-400" />
                  <div>
                    <p className="font-semibold text-slate-50">Historial listo</p>
                    <p className="text-slate-400">Los datos de la muestra se guardan en el arreglo base y se pueden sustituir por tu API.</p>
                  </div>
                </li>
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

function SeverityChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl px-4 py-3 text-center shadow-inner shadow-black/30 ${color}`}>
      <div className="text-sm font-semibold text-slate-50">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
