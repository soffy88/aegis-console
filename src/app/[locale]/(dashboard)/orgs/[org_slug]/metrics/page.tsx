"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

function niceTs(ts: string, span: boolean) {
  const d = new Date(ts);
  return span
    ? d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function LineChart({ points, unit, bucketSeconds }: { points: QueryPoint[]; unit: string; bucketSeconds: number }) {
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
  const times = points.map((p) => new Date(p.ts).getTime());
  const tMin = times[0]!;
  const tSpan = times.at(-1)! - tMin || 1;
  const xAt = (i: number) => padL + (points.length > 1 ? ((times[i]! - tMin) / tSpan) * plotW : plotW / 2);
  const yAt = (v: number) => padT + plotH - ((v - min) / span) * plotH;

  // Query buckets with no row (scrape gap: exporter down, host rebooted, ...) are
  // simply absent, not zero — so a plain x ∝ time axis would draw one continuous line
  // straight across the gap as if it were densely sampled the whole way through. Split
  // into segments at any gap much wider than the bucket interval so the empty stretch
  // reads as a visible break instead of a fabricated trend.
  const gapMs = bucketSeconds * 3 * 1000;
  const segments: number[][] = [[0]];
  for (let i = 1; i < points.length; i++) {
    if (times[i]! - times[i - 1]! > gapMs) segments.push([]);
    segments.at(-1)!.push(i);
  }

  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => min + (span * i) / ticks);
  const spansDays = new Date(points.at(-1)!.ts).getTime() - new Date(points[0]!.ts).getTime() > 26 * 3600e3;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(xAt(i) - x);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setHover(best);
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

        {/* area + line, drawn per contiguous segment so scrape gaps show as a break
            instead of a straight line bridging hours of missing data */}
        {segments.map((seg, si) => {
          if (seg.length === 0) return null;
          const segLine = seg.map((i) => `${xAt(i).toFixed(1)},${yAt(points[i]!.value).toFixed(1)}`).join(" ");
          if (seg.length < 2) {
            const i = seg[0]!;
            return <circle key={si} cx={xAt(i)} cy={yAt(points[i]!.value)} r="2" fill="var(--primary)" />;
          }
          const first = seg[0]!;
          const last = seg.at(-1)!;
          const segArea = `${xAt(first).toFixed(1)},${(padT + plotH).toFixed(1)} ${segLine} ${xAt(last).toFixed(1)},${(padT + plotH).toFixed(1)}`;
          return (
            <g key={si}>
              <polygon points={segArea} fill="url(#area-detail)" />
              <polyline points={segLine} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [metric, setMetric] = useState<string>(searchParams.get("metric") ?? "");
  const [host, setHost] = useState<string>(searchParams.get("host") ?? "");
  const [rangeIdx, setRangeIdx] = useState(() => {
    const r = Number(searchParams.get("range"));
    return Number.isInteger(r) && r >= 0 && r < RANGES.length ? r : 1;
  });
  const [agg, setAgg] = useState(searchParams.get("agg") ?? "avg");

  const range = RANGES[rangeIdx] ?? RANGES[1]!;

  // Keep the four filters in the URL query so a refresh / deep-link restores them.
  useEffect(() => {
    const params = new URLSearchParams();
    if (metric) params.set("metric", metric);
    if (host) params.set("host", host);
    params.set("agg", agg);
    params.set("range", String(rangeIdx));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [metric, host, agg, rangeIdx, pathname, router]);

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

  // Default to a useful key metric (cAdvisor / uptime) if present, else the first —
  // unless the caller already deep-linked via ?metric= (e.g. from a dashboard tile).
  // Derived during render (guarded so it runs once when names first load), which
  // React recommends over a setState-in-effect.
  if (!metric && metricNames.length > 0) {
    const preferred = [
      "container_cpu_percent",
      "container_memory_working_set_bytes",
      "probe_up",
      "container_memory_usage_bytes",
    ];
    setMetric(preferred.find((p) => metricNames.includes(p)) ?? metricNames[0]!);
  }

  const unit = useMemo(
    () => (series ?? []).find((s) => s.metric_name === metric)?.unit ?? "",
    [series, metric],
  );

  const { data: result, isLoading: dataLoading, isError: dataIsError, error: dataError } = useQuery<QueryResult>({
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

      {!seriesLoading && metricNames.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
          {t("noSeries")}
        </p>
      )}

      {metricNames.length > 0 && (
        <>
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
            ) : dataIsError ? (
              <p className="text-destructive py-16 text-center text-sm">
                {t("loadError")}: {(dataError as Error).message}
              </p>
            ) : (
              <LineChart points={result?.points ?? []} unit={unit} bucketSeconds={result?.bucket_seconds ?? range.bucket} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
