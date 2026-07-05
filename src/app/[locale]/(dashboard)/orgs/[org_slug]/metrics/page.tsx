"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";

interface SeriesEntry {
  hostname: string;
  metric_name: string;
  unit: string;
  samples: number;
}

interface QueryPoint {
  ts: string;
  value: number;
}

interface QueryResult {
  metric_name: string;
  hostname: string | null;
  bucket_seconds: number;
  agg: string;
  points: QueryPoint[];
}

interface TopSeriesEntry {
  name: string;
  image: string | null;
  value: number;
  ts: string;
}

const RANGES = [
  { hours: 1, bucket: 60 },
  { hours: 6, bucket: 300 },
  { hours: 24, bucket: 900 },
  { hours: 24 * 7, bucket: 3600 },
];
const AGGS = ["avg", "max", "min", "sum"];

// Status levels drive dot + meter + spark color, never color-alone (the dot pairs
// with the tile label, the meter/spark reinforce). Colors come from design tokens
// where they exist; emerald ("ok") follows the codebase's existing convention.
type Level = "info" | "ok" | "warn" | "crit";
const LEVEL_COLOR: Record<Level, string> = {
  info: "var(--primary)",
  ok: "#34d399",
  warn: "var(--warning)",
  crit: "var(--destructive)",
};
const sanitize = (s: string) => s.replace(/[^a-z0-9]/gi, "");

function niceTs(ts: string, span: boolean) {
  const d = new Date(ts);
  return span
    ? d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function LineChart({ points, unit }: { points: QueryPoint[]; unit: string }) {
  const t = useTranslations("metrics");
  const [hover, setHover] = useState<number | null>(null);

  const w = 760;
  const h = 264;
  const padL = 48;
  const padR = 14;
  const padT = 16;
  const padB = 30;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  if (points.length === 0) {
    return <p className="text-muted-foreground py-16 text-center text-sm">{t("noData")}</p>;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const xAt = (i: number) => padL + (points.length > 1 ? (i * plotW) / (points.length - 1) : plotW / 2);
  const yAt = (v: number) => padT + plotH - ((v - min) / span) * plotH;

  const linePts = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(" ");
  const areaPts = `${xAt(0).toFixed(1)},${(padT + plotH).toFixed(1)} ${linePts} ${xAt(points.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)}`;

  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => min + (span * i) / ticks);
  const spansDays = new Date(points.at(-1)!.ts).getTime() - new Date(points[0]!.ts).getTime() > 26 * 3600e3;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    if (points.length < 2) return setHover(0);
    const step = plotW / (points.length - 1);
    const i = Math.round((x - padL) / step);
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  const hp = hover !== null ? points[hover]! : null;
  const hx = hover !== null ? xAt(hover) : 0;
  const hy = hp ? yAt(hp.value) : 0;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        style={{ height: h }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
      >
        <defs>
          <linearGradient id="area-detail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines + y labels */}
        {gridVals.map((v, i) => {
          const y = yAt(v);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--border)" strokeOpacity={i === 0 ? 0.9 : 0.4} strokeWidth="1" />
              <text x={padL - 8} y={y + 3} textAnchor="end" className="fill-[color:var(--muted-foreground)]" fontSize="10">
                {Math.abs(v) >= 1e9 ? `${(v / 1e9).toFixed(1)}G` : Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : v.toFixed(v % 1 === 0 ? 0 : 1)}
              </text>
            </g>
          );
        })}

        {/* area + line */}
        <polygon points={areaPts} fill="url(#area-detail)" />
        <polyline points={linePts} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* x endpoints */}
        <text x={padL} y={h - 10} textAnchor="start" className="fill-[color:var(--muted-foreground)]" fontSize="10">{niceTs(points[0]!.ts, spansDays)}</text>
        <text x={w - padR} y={h - 10} textAnchor="end" className="fill-[color:var(--muted-foreground)]" fontSize="10">{niceTs(points.at(-1)!.ts, spansDays)}</text>

        {/* hover crosshair + marker + tooltip */}
        {hp && (
          <g>
            <line x1={hx} y1={padT} x2={hx} y2={padT + plotH} stroke="var(--muted-foreground)" strokeOpacity="0.5" strokeDasharray="3 3" />
            <circle cx={hx} cy={hy} r="4" fill="var(--primary)" stroke="var(--card)" strokeWidth="2" />
            <g transform={`translate(${Math.min(Math.max(hx, padL + 54), w - padR - 54)}, ${padT + 10})`}>
              <rect x="-52" y="-2" width="104" height="34" rx="6" fill="var(--card)" stroke="var(--border)" />
              <text x="0" y="11" textAnchor="middle" className="fill-[color:var(--foreground)]" fontSize="11" fontWeight="600">
                {hp.value.toFixed(2)}{unit}
              </text>
              <text x="0" y="24" textAnchor="middle" className="fill-[color:var(--muted-foreground)]" fontSize="9">
                {niceTs(hp.ts, spansDays)}
              </text>
            </g>
          </g>
        )}
      </svg>
      <p className="text-muted-foreground mt-2 text-xs">
        Latest:{" "}
        <span className="text-foreground font-mono font-semibold tabular-nums">{points.at(-1)!.value.toFixed(2)}{unit}</span>
        {" · "}
        {new Date(points.at(-1)!.ts).toLocaleString()}
      </p>
    </div>
  );
}

// ── Tiled overview of the main monitoring metrics (shown without any selection) ──
type Tile = {
  metric: string;
  label: string;
  agg: string;
  fmt: (v: number) => string;
  level: (v: number) => Level;
  meter?: boolean; // value is a bounded 0–100 percentage → show a meter bar
  showTopSeries?: boolean; // also resolve + show *which* container holds this value
};

// Human-readable container label from a cAdvisor image ref, e.g.
// "docker.io/library/quant-qlib-v2:latest" → "quant-qlib-v2".
function friendlyImageName(image: string | null): string | null {
  if (!image) return null;
  const noRegistry = image.split("/").pop() ?? image;
  const noTag = noRegistry.split("@")[0]!.replace(/:[^:]+$/, "");
  return noTag || noRegistry;
}

const fmtGB = (v: number) => `${(v / 1e9).toFixed(1)} GB`;
const KEY_METRICS: Tile[] = [
  // Whole-host totals (node_exporter). "整机" = the whole machine incl. non-container
  // processes — vs the per-container "最忙/最大" tiles below which flag a single hot container.
  { metric: "node_cpu_percent", label: "整机 CPU", agg: "avg", meter: true,
    fmt: (v) => `${v.toFixed(0)}%`, level: (v) => (v >= 85 ? "crit" : v >= 60 ? "warn" : "info") },
  { metric: "node_memory_used_percent", label: "整机内存", agg: "avg", meter: true,
    fmt: (v) => `${v.toFixed(0)}%`, level: (v) => (v >= 90 ? "crit" : v >= 75 ? "warn" : "info") },
  { metric: "container_cpu_percent", label: "最忙容器 CPU", agg: "max", showTopSeries: true,
    fmt: (v) => `${v.toFixed(0)}%`, level: (v) => (v >= 1000 ? "crit" : v >= 700 ? "warn" : "info") },
  { metric: "container_memory_working_set_bytes", label: "最大容器内存", agg: "max", showTopSeries: true,
    fmt: fmtGB, level: (v) => (v >= 28e9 ? "crit" : v >= 20e9 ? "warn" : "info") },
  { metric: "container_fs_usage_bytes", label: "磁盘使用", agg: "max",
    fmt: (v) => `${(v / 1e9).toFixed(0)} GB`, level: () => "info" },
  { metric: "probe_up", label: "服务在线", agg: "min",
    fmt: (v) => (v >= 1 ? "全部在线" : "有掉线"), level: (v) => (v >= 1 ? "ok" : "crit") },
];

function Sparkline({ points, color, id }: { points: QueryPoint[]; color: string; id: string }) {
  const w = 280;
  const h = 44;
  if (points.length === 0) return <div style={{ height: h }} />;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const pts = points.map((p, i) => `${(i * step).toFixed(1)},${(h - 2 - ((p.value - min) / span) * (h - 4)).toFixed(1)}`).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#spark-${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function MetricTile({ tile, onSelect }: { tile: Tile; onSelect: (metric: string) => void }) {
  const { data, isLoading } = useQuery<QueryResult>({
    queryKey: ["mtile", tile.metric, tile.agg],
    queryFn: () =>
      aegisFetch<QueryResult>(
        paths.metricsQuery({ metric_name: tile.metric, hours: 6, bucket_seconds: 300, agg: tile.agg }),
      ),
    refetchInterval: 30000,
  });
  const points = data?.points ?? [];
  const last = points.length > 0 ? points[points.length - 1]!.value : null;
  const level: Level = last !== null ? tile.level(last) : "info";
  const color = last !== null ? LEVEL_COLOR[level] : "var(--muted-foreground)";

  const { data: topSeries } = useQuery<TopSeriesEntry[]>({
    queryKey: ["mtile-top", tile.metric],
    queryFn: () =>
      aegisFetch<TopSeriesEntry[]>(paths.metricsTopSeries({ metric_name: tile.metric, hours: 0.25 })),
    enabled: !!tile.showTopSeries,
    refetchInterval: 30000,
  });
  const topLabel = tile.showTopSeries ? friendlyImageName(topSeries?.[0]?.image ?? null) : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(tile.metric)}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--ring)] hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">{tile.label}</span>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 0 3px color-mix(in oklch, ${color} 20%, transparent)` }}
        />
      </div>

      <div className="flex items-baseline">
        {isLoading && last === null ? (
          <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" />
        ) : (
          <span className="text-foreground text-3xl font-semibold tracking-tight tabular-nums">
            {last !== null ? tile.fmt(last) : "—"}
          </span>
        )}
      </div>

      {topLabel && (
        <p className="-mt-2 truncate text-xs text-muted-foreground" title={topLabel}>
          {topLabel}
        </p>
      )}

      {tile.meter && (
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${last !== null ? Math.min(100, Math.max(0, last)) : 0}%`, background: color }}
          />
        </div>
      )}

      <div style={{ color }}>
        <Sparkline points={points} color={color} id={sanitize(tile.metric)} />
      </div>
    </button>
  );
}

function RangeToggle({ idx, onChange }: { idx: number; onChange: (i: number) => void }) {
  return (
    <div className="bg-card inline-flex rounded-lg border p-0.5">
      {RANGES.map((r, i) => (
        <button
          key={r.hours}
          type="button"
          onClick={() => onChange(i)}
          aria-pressed={i === idx}
          className={`rounded-md px-3 py-1 text-sm font-medium transition ${
            i === idx
              ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {r.hours >= 24 ? `${r.hours / 24}d` : `${r.hours}h`}
        </button>
      ))}
    </div>
  );
}

export default function MetricsPage() {
  const t = useTranslations("metrics");
  const [metric, setMetric] = useState<string>("");
  const [host, setHost] = useState<string>("");
  const [rangeIdx, setRangeIdx] = useState(1);
  const [agg, setAgg] = useState("avg");

  const range = RANGES[rangeIdx] ?? RANGES[1]!;

  const { data: series, isLoading: seriesLoading } = useQuery<SeriesEntry[]>({
    queryKey: ["metrics-series"],
    queryFn: () => aegisFetch<SeriesEntry[]>(paths.metricsSeries(24 * 7)),
  });

  const metricNames = useMemo(
    () => Array.from(new Set((series ?? []).map((s) => s.metric_name))).sort(),
    [series],
  );
  const hosts = useMemo(
    () =>
      Array.from(
        new Set((series ?? []).filter((s) => !metric || s.metric_name === metric).map((s) => s.hostname)),
      ).sort(),
    [series, metric],
  );

  // Default to a useful key metric (cAdvisor / uptime) if present, else the first.
  useEffect(() => {
    if (!metric && metricNames.length > 0) {
      const preferred = [
        "container_cpu_percent",
        "container_memory_working_set_bytes",
        "probe_up",
        "container_memory_usage_bytes",
      ];
      setMetric(preferred.find((p) => metricNames.includes(p)) ?? metricNames[0]!);
    }
  }, [metric, metricNames]);

  const unit = useMemo(
    () => (series ?? []).find((s) => s.metric_name === metric)?.unit ?? "",
    [series, metric],
  );

  const { data: result, isLoading: dataLoading } = useQuery<QueryResult>({
    queryKey: ["metrics-query", metric, host, range.hours, range.bucket, agg],
    queryFn: () =>
      aegisFetch<QueryResult>(
        paths.metricsQuery({
          metric_name: metric,
          hostname: host || undefined,
          hours: range.hours,
          bucket_seconds: range.bucket,
          agg,
        }),
      ),
    enabled: !!metric,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Tiled overview — main monitoring metrics, shown without any selection */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KEY_METRICS.map((tile) => (
          <MetricTile
            key={tile.metric}
            tile={tile}
            onSelect={(m) => {
              setMetric(m);
              document.getElementById("metric-detail")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        ))}
      </div>

      {!seriesLoading && metricNames.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
          {t("noSeries")}
        </p>
      )}

      {metricNames.length > 0 && (
        <>
          <h2 id="metric-detail" className="scroll-mt-4 border-t pt-6 text-lg font-semibold tracking-tight">{t("detail")}</h2>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{t("metric")}</span>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="min-w-[220px] rounded-md border bg-background px-3 py-1.5 font-mono text-xs"
              >
                {metricNames.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{t("host")}</span>
              <select
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="rounded-md border bg-background px-3 py-1.5"
              >
                <option value="">{t("allHosts")}</option>
                {hosts.map((hn) => (
                  <option key={hn} value={hn}>{hn}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{t("agg")}</span>
              <select
                value={agg}
                onChange={(e) => setAgg(e.target.value)}
                className="rounded-md border bg-background px-3 py-1.5"
              >
                {AGGS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{t("range")}</span>
              <RangeToggle idx={rangeIdx} onChange={setRangeIdx} />
            </label>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            {dataLoading ? (
              <div className="flex h-[264px] items-center justify-center">
                <span className="bg-muted h-full w-full animate-pulse rounded-lg" />
              </div>
            ) : (
              <LineChart points={result?.points ?? []} unit={unit} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
