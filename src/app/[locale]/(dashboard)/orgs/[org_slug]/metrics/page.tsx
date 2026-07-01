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

const RANGES = [
  { hours: 1, bucket: 60 },
  { hours: 6, bucket: 300 },
  { hours: 24, bucket: 900 },
  { hours: 24 * 7, bucket: 3600 },
];
const AGGS = ["avg", "max", "min", "sum"];

function LineChart({ points, unit }: { points: QueryPoint[]; unit: string }) {
  const w = 720;
  const h = 240;
  const pad = 32;
  const t = useTranslations("metrics");

  if (points.length === 0) {
    return <p className="text-muted-foreground py-12 text-center">{t("noData")}</p>;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const xStep = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = pad + i * xStep;
    const y = h - pad - ((p.value - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = points[points.length - 1]!;

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="text-blue-500">
        {/* axes */}
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" strokeOpacity="0.2" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="currentColor" strokeOpacity="0.2" />
        {/* y labels */}
        <text x={4} y={pad + 4} className="fill-muted-foreground text-[10px]">
          {max.toFixed(1)}
        </text>
        <text x={4} y={h - pad} className="fill-muted-foreground text-[10px]">
          {min.toFixed(1)}
        </text>
        <polyline points={coords.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx={pad + (points.length - 1) * xStep} cy={h - pad - ((last.value - min) / span) * (h - pad * 2)} r="3" fill="currentColor" />
      </svg>
      <p className="text-muted-foreground text-sm">
        Latest: <span className="text-foreground font-mono font-semibold">{last.value.toFixed(2)}{unit}</span>
        {" · "}
        {new Date(last.ts).toLocaleString()}
      </p>
    </div>
  );
}

// ── Tiled overview of the main monitoring metrics (shown without any selection) ──
type Tile = { metric: string; label: string; agg: string; fmt: (v: number) => string; accent: (v: number) => string };

const fmtGB = (v: number) => `${(v / 1e9).toFixed(1)} GB`;
const KEY_METRICS: Tile[] = [
  { metric: "container_cpu_percent", label: "最忙容器 CPU", agg: "max",
    fmt: (v) => `${v.toFixed(0)}%`, accent: (v) => (v >= 1000 ? "text-red-400" : v >= 700 ? "text-amber-400" : "text-blue-400") },
  { metric: "container_memory_working_set_bytes", label: "最大容器内存", agg: "max",
    fmt: fmtGB, accent: (v) => (v >= 28e9 ? "text-red-400" : v >= 20e9 ? "text-amber-400" : "text-blue-400") },
  { metric: "container_fs_usage_bytes", label: "磁盘使用", agg: "max",
    fmt: (v) => `${(v / 1e9).toFixed(0)} GB`, accent: () => "text-blue-400" },
  { metric: "probe_up", label: "服务在线", agg: "min",
    fmt: (v) => (v >= 1 ? "全部在线" : "有掉线"), accent: (v) => (v >= 1 ? "text-emerald-400" : "text-red-400") },
];

function Sparkline({ points, className }: { points: QueryPoint[]; className?: string }) {
  const w = 280;
  const h = 52;
  if (points.length === 0) return <div className="h-[52px]" />;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => `${(i * step).toFixed(1)},${(h - ((p.value - min) / span) * h).toFixed(1)}`);
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className}>
      <polyline points={coords.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function MetricTile({ tile, onSelect }: { tile: Tile; onSelect: (metric: string) => void }) {
  const { data } = useQuery<QueryResult>({
    queryKey: ["mtile", tile.metric, tile.agg],
    queryFn: () =>
      aegisFetch<QueryResult>(
        paths.metricsQuery({ metric_name: tile.metric, hours: 6, bucket_seconds: 300, agg: tile.agg }),
      ),
    refetchInterval: 30000,
  });
  const points = data?.points ?? [];
  const last = points.length > 0 ? points[points.length - 1]!.value : null;
  const accent = last !== null ? tile.accent(last) : "text-muted-foreground";
  return (
    <button
      type="button"
      onClick={() => onSelect(tile.metric)}
      className="rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-[var(--primary)] hover:shadow-md"
    >
      <p className="text-muted-foreground text-sm">{tile.label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{last !== null ? tile.fmt(last) : "—"}</p>
      <div className={`mt-2 ${accent}`}>
        <Sparkline points={points} />
      </div>
    </button>
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
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Tiled overview — main monitoring metrics, shown without any selection */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <h2 id="metric-detail" className="scroll-mt-4 border-t pt-4 text-lg font-semibold">{t("detail")}</h2>
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{t("metric")}</span>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="rounded-md border bg-background px-3 py-1.5"
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
              <span className="text-muted-foreground">{t("range")}</span>
              <select
                value={rangeIdx}
                onChange={(e) => setRangeIdx(Number(e.target.value))}
                className="rounded-md border bg-background px-3 py-1.5"
              >
                {RANGES.map((r, i) => (
                  <option key={r.hours} value={i}>{r.hours >= 24 ? `${r.hours / 24}d` : `${r.hours}h`}</option>
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
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            {dataLoading ? (
              <p className="text-muted-foreground py-12 text-center">Loading…</p>
            ) : (
              <LineChart points={result?.points ?? []} unit={unit} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
