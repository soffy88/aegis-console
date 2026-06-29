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

  // Default to the first metric once series load.
  useEffect(() => {
    if (!metric && metricNames.length > 0) setMetric(metricNames[0]!);
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
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {!seriesLoading && metricNames.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
          {t("noSeries")}
        </p>
      )}

      {metricNames.length > 0 && (
        <>
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
