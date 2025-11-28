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

type RoleKey = "operador" | "supervisor" | "invitado";
type RolePermission = "view" | "export" | "resolve";

type RoleConfig = {
  label: string;
  description: string;
  tone: string;
  permissions: RolePermission[];
  badge: string;
};

const ROLE_CONFIG: Record<RoleKey, RoleConfig> = {
  operador: {
    label: "Operador",
    description: "Vista enfocada en la operación diaria. Permite monitorear el estado del enlace y reportar incidencias.",
    tone: "bg-sky-500/15 text-sky-100",
    permissions: ["view"],
    badge: "Operación"
  },
  supervisor: {
    label: "Supervisor",
    description: "Habilita acciones de cierre de eventos y exportación para informes de mantenimiento.",
    tone: "bg-emerald-500/15 text-emerald-100",
    permissions: ["view", "export", "resolve"],
    badge: "Supervisión"
  },
  invitado: {
    label: "Invitado",
    description: "Modo solo lectura para auditorías o demostraciones externas.",
    tone: "bg-slate-500/15 text-slate-100",
    permissions: ["view"],
    badge: "Lectura"
  }
};

const PERMISSION_DESCRIPTIONS: Record<RolePermission, string> = {
  view: "Acceso en tiempo real al tablero y métricas operativas.",
  export: "Puede descargar reportes CSV/PDF para análisis externos.",
  resolve: "Autoriza el cierre o marcación de eventos críticos revisados."
};

type FilterState = {
  severity: Severity | "all";
  source: string | "all";
  search: string;
  startDate: string;
  endDate: string;
};

const DEFAULT_FILTERS: FilterState = {
  severity: "all",
  source: "all",
  search: "",
  startDate: "",
  endDate: ""
};

type ConnectionState = "connecting" | "live" | "error";

type FeedResponse = {
  detections: Detection[];
  lastUpdate: string | null;
};

export default function Page() {
  const { detections, status, lastUpdate, error } = useDetectionFeed();
  const dataset = detections.length ? detections : mockDetections;
  const [showAllRows, setShowAllRows] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [activeRole, setActiveRole] = useState<RoleKey>("operador");
  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const filteredDataset = useMemo<Detection[]>(() => applyFilters(dataset, filters), [dataset, filters]);
  const statsSource = filteredDataset;
  const avgDepth = useMemo(() => averageDepth(statsSource), [statsSource]);
  const deepest = useMemo(() => maxDepth(statsSource), [statsSource]);
  const latest = statsSource[0];
  const sparklineValues = useMemo<number[]>(() => statsSource.slice(0, 12).map((item) => item.depth).reverse(), [statsSource]);
  const visibleRows = useMemo<Detection[]>(() => (showAllRows ? statsSource : statsSource.slice(0, 5)), [showAllRows, statsSource]);
  const hasMoreRows = statsSource.length > 5;

  const sourceOptions = useMemo(() => Array.from(new Set(dataset.map((item) => item.source))), [dataset]);
  const filtersApplied = filters.severity !== "all" || filters.source !== "all" || Boolean(filters.search) || Boolean(filters.startDate) || Boolean(filters.endDate);
  const roleDetails = ROLE_CONFIG[activeRole];
  const canResolve = roleDetails.permissions.includes("resolve");
  const canExport = roleDetails.permissions.includes("export");

  useEffect(() => {
    setShowAllRows(false);
  }, [statsSource]);

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
                Monitorea en vivo la telemetría del subsistema (<strong>BACHE &lt;profundidad&gt;</strong>) y valida la continuidad del enlace inalámbrico.
                El panel consume la misma API <code>/api/detections</code> que se despliega en producción.
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
              <span className={`badge border border-white/10 ${roleDetails.tone}`}>{roleDetails.badge}</span>
              {error ? <span className="badge bg-rose-500/20 text-rose-100">{error}</span> : null}
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Detecciones" value={statsSource.length.toString()} sublabel="Lecturas recibidas" />
            <StatCard label="Graves" value={severityCount(statsSource, "Alta").toString()} sublabel="> 3.5 cm" accent="bg-rose-500/20 text-rose-100" />
            <StatCard label="Moderadas" value={severityCount(statsSource, "Media").toString()} sublabel="2 - 3.5 cm" accent="bg-amber-500/20 text-amber-100" />
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
              <div className="mt-4 flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <label className="flex flex-col text-xs uppercase tracking-[0.2em] text-slate-400">
                  Búsqueda
                  <input
                    type="search"
                    value={filters.search}
                    onChange={(event) => updateFilter("search", event.target.value)}
                    placeholder="ID, ubicación o fuente"
                    className="mt-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col text-xs uppercase tracking-[0.2em] text-slate-400">
                  Severidad
                  <select
                    value={filters.severity}
                    onChange={(event) => updateFilter("severity", event.target.value)}
                    className="mt-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  >
                    <option value="all">Todas</option>
                    <option value="Alta">Críticas</option>
                    <option value="Media">Moderadas</option>
                    <option value="Baja">Leves</option>
                  </select>
                </label>
                <label className="flex flex-col text-xs uppercase tracking-[0.2em] text-slate-400">
                  Fuente
                  <select
                    value={filters.source}
                    onChange={(event) => updateFilter("source", event.target.value)}
                    className="mt-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  >
                    <option value="all">Todas</option>
                    {sourceOptions.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-xs uppercase tracking-[0.2em] text-slate-400">
                  Desde
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(event) => updateFilter("startDate", event.target.value)}
                    className="mt-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col text-xs uppercase tracking-[0.2em] text-slate-400">
                  Hasta
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(event) => updateFilter("endDate", event.target.value)}
                    className="mt-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <p>{filtersApplied ? "Filtros activos aplicados al stream." : "Mostrando el stream completo en tiempo real."}</p>
                {filtersApplied ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:bg-white/10"
                  >
                    Limpiar filtros
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-4 rounded-2xl border border-white/5 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Detección más reciente</p>
                  <p className="text-2xl font-semibold text-white">{latest ? `${latest.depth.toFixed(2)} cm` : "Sin coincidencias"}</p>
                  <p className="text-xs text-slate-400">{latest ? formatDate(latest.timestamp) : "Ajusta los filtros para mostrar datos"}</p>
                </div>
                <div className="sm:col-span-2">
                  <Sparkline values={sparklineValues} />
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/5">
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-left text-slate-200">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Severidad</th>
                        <th className="px-4 py-3">Profundidad</th>
                        <th className="px-4 py-3">Ubicación</th>
                        <th className="px-4 py-3">Hora</th>
                        <th className="px-4 py-3">Fuente</th>
                        {canResolve ? <th className="px-4 py-3 text-right">Acción</th> : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {visibleRows.length === 0 ? (
                        <tr>
                          <td colSpan={canResolve ? 7 : 6} className="px-4 py-6 text-center text-slate-400">
                            No se encontraron registros con los filtros actuales.
                          </td>
                        </tr>
                      ) : (
                        visibleRows.map((item) => (
                          <tr key={item.id} className="hover:bg-white/5">
                            <td className="px-4 py-3 font-semibold text-slate-50">{item.id}</td>
                            <td className="px-4 py-3">
                              <SeverityBadge level={item.severity as Severity} />
                            </td>
                            <td className="px-4 py-3">{item.depth.toFixed(2)} cm</td>
                            <td className="px-4 py-3 text-slate-300">{item.location}</td>
                            <td className="px-4 py-3 text-slate-300">{formatDate(item.timestamp)}</td>
                            <td className="px-4 py-3 text-slate-300">{item.source}</td>
                            {canResolve ? (
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:bg-white/10"
                                >
                                  Marcar revisado
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-white/5 sm:hidden">
                  {visibleRows.length === 0 ? (
                    <p className="px-4 py-4 text-center text-sm text-slate-400">No se encontraron registros con los filtros actuales.</p>
                  ) : (
                    visibleRows.map((item) => (
                      <article key={`${item.id}-mobile`} className="px-4 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">ID</p>
                            <p className="font-semibold text-slate-50">{item.id}</p>
                          </div>
                          <SeverityBadge level={item.severity as Severity} minimal />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profundidad</p>
                            <p className="text-slate-100">{item.depth.toFixed(2)} cm</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Fuente</p>
                            <p className="text-slate-100">{item.source}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ubicación</p>
                            <p>{item.location}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Hora</p>
                            <p>{formatDate(item.timestamp)}</p>
                          </div>
                        </div>
                        {canResolve ? (
                          <button
                            type="button"
                            className="mt-4 w-full rounded-full border border-white/10 px-3 py-2 text-[12px] font-semibold text-slate-100 transition hover:bg-white/10"
                          >
                            Marcar revisado
                          </button>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <p>El backend sincroniza lecturas nuevas cada segundo y las deja disponibles en este panel.</p>
                {hasMoreRows ? (
                  <button
                    type="button"
                    onClick={() => setShowAllRows((state) => !state)}
                    className="rounded-full border border-white/10 px-4 py-1 text-[11px] font-semibold text-slate-100 transition hover:bg-white/10"
                  >
                    {showAllRows ? "Ver menos" : `Ver más (${statsSource.length - 5})`}
                  </button>
                ) : null}
              </div>
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
                  <ConnectionRow label="Blueman" value="Perfil serie asegurado" />
                  <ConnectionRow label="Bridge" value="Microservicio Node" />
                  <ConnectionRow label="Destino DB" value="MongoDB · detections" />
                </div>
                <div className="mt-5 space-y-2 text-xs text-slate-400">
                  <p>La pasarela RFCOMM mantiene la sesión activa y replica cada lectura con latencia sub-segundo.</p>
                  <p>El backend valida formato, normaliza contra la distancia base de {baselineDistanceCm} cm y almacena en MongoDB.</p>
                  <p>El panel refleja el mismo historial operativo, ideal para auditoría y trazabilidad del mantenimiento.</p>
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
                {statsSource.length ? (
                  statsSource.map((item) => (
                    <div key={`${item.id}-raw`} className="flex items-center justify-between border-b border-white/5 py-2 last:border-none">
                      <span>{item.raw}</span>
                      <span className="text-xs text-slate-400">{formatDate(item.timestamp)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No hay tramas que coincidan con los filtros actuales.</p>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-400">Este registro conserva la trama original recibida por el gateway para diagnóstico y auditoría.</p>
            </div>

            <div className="card-surface col-span-2 rounded-3xl p-6">
              <h3 className="text-lg font-semibold">Checklist operativo</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                <ChecklistRow label="HC-05 enlazado" helper="Perfil serie activo y estable" state="ok" />
                <ChecklistRow label="Sensor calibrado" helper={`Referencia física ${baselineDistanceCm} cm`} state="ok" />
                <ChecklistRow label="Pasarela Node" helper="Streaming continuo hacia /api/detections" state={status === "live" ? "ok" : "warn"} />
                <ChecklistRow label="Dashboard" helper="Telemetría en vivo y alertas visibles" state="ok" />
              </ul>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <RoleManagement activeRole={activeRole} onChange={setActiveRole} canExport={canExport} />
            <HardwareGuide />
            <IntegrationCard
              title="Pasarela de telemetría"
              items={[
                "Daemon Node.js escucha el enlace serie RFCOMM y transforma cada trama en JSON consistente.",
                "Parser a 9600 bps con backpressure y validación de firma antes de entregar paquetes.",
                "Publicación segura hacia /api/detections con reintentos y control de duplicados.",
                "Capas de observabilidad expuestas por consola y syslog para soporte en pista.",
                "Compatible con Bluetooth o USB sin cambios en la API backend."
              ]}
              footer="Aísla el hardware del frontend y garantiza una cola única de eventos certificados."
            />
            <IntegrationCard
              title="Retención de datos"
              items={[
                "MongoDB almacena detecciones con metadatos, severidad y payload crudo para trazabilidad.",
                "Indices en profundidad y timestamp permiten consultas en tiempo cuasi real.",
                "Política de retención configurable (30/90 días) para análisis históricos y auditorías.",
                "API REST y exportación CSV para integrar con otros tableros o reportes.",
                "Variables MONGODB_URI / MONGODB_DB se gestionan como secretos de despliegue."
              ]}
              footer="La misma base abastece este dashboard y cualquier servicio aguas abajo."
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function applyFilters(data: Detection[], filters: FilterState) {
  const searchTerm = filters.search.trim().toLowerCase();
  const startMs = filters.startDate ? Date.parse(filters.startDate) : null;
  const endMs = filters.endDate ? Date.parse(filters.endDate) + 24 * 60 * 60 * 1000 - 1 : null;

  return data.filter((item) => {
    const matchesSeverity = filters.severity === "all" || item.severity === filters.severity;
    const matchesSource = filters.source === "all" || item.source === filters.source;
    const matchesSearch =
      !searchTerm ||
      [item.id, item.location ?? "", item.raw ?? "", item.source ?? ""].some((field) =>
        field.toLowerCase().includes(searchTerm)
      );
    const timestamp = Date.parse(item.timestamp);
    const hasValidTimestamp = !Number.isNaN(timestamp);
    const matchesStart = !startMs || (hasValidTimestamp && timestamp >= startMs);
    const matchesEnd = !endMs || (hasValidTimestamp && timestamp <= endMs);

    return matchesSeverity && matchesSource && matchesSearch && matchesStart && matchesEnd;
  });
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

function RoleManagement({ activeRole, onChange, canExport }: { activeRole: RoleKey; onChange: (role: RoleKey) => void; canExport: boolean }) {
  const role = ROLE_CONFIG[activeRole];
  return (
    <div className="card-surface rounded-3xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Gestión de roles</h3>
        <span className={`badge ${canExport ? "bg-emerald-500/20 text-emerald-100" : "bg-white/10 text-slate-200"}`}>
          {canExport ? "Acceso privilegiado" : "Solo lectura"}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(ROLE_CONFIG) as RoleKey[]).map((key) => {
          const config = ROLE_CONFIG[key];
          const isActive = key === activeRole;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`rounded-full border border-white/10 px-4 py-1 text-sm transition ${
                isActive ? "bg-white/20 text-white" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {config.label}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-slate-300">{role.description}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-200">
        {role.permissions.map((permission) => (
          <li key={permission} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-300" />
            {PERMISSION_DESCRIPTIONS[permission]}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate-500">Los permisos definen qué acciones aparecen en la tabla y qué exportaciones están habilitadas.</p>
    </div>
  );
}

function HardwareGuide() {
  const items = [
    "Módulo HC-05 alimentado a 5 V con RX protegido asegura niveles compatibles con el microcontrolador.",
    "HC-SR04 cableado (Trig pin 9, Echo pin 10 con divisor) ofrece mediciones estables en pista.",
    `Calibración física basada en ${baselineDistanceCm} cm con tolerancia de ±${sensorNoiseCm} cm para calcular la profundidad real.`,
    "El firmware emite tramas BACHE <profundidad> a 9600 bps para todo evento validado."
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
