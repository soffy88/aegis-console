"use client";

import { useQuery } from "@tanstack/react-query";
import { OSparkline } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";

interface QueryResult {
  metric_name: string;
  hostname: string | null;
  bucket_seconds: number;
  agg: string;
  points: { ts: string; value: number }[];
}

interface TopSeriesEntry {
  name: string;
  image: string | null;
  value: number;
  ts: string;
}

// OSparkline plots points evenly spaced by *index*, not by timestamp — it has no
// notion of time at all. A scrape outage (exporter down, host rebooted, ...) leaves a
// silent gap with zero rows, so the few real points right after recovery get stretched
// across the sparkline's full width, making a 30-minute recovery look like it was a
// smooth multi-hour trend. Trimming to the latest contiguous run (dropping everything
// before the most recent gap) keeps the remaining points close to evenly spaced for
// real, so the index-based x-axis stops lying about elapsed time.
function trimToLatestRun<T extends { ts: string }>(points: T[], bucketSeconds: number): T[] {
  const gapMs = bucketSeconds * 3 * 1000;
  for (let i = points.length - 1; i > 0; i--) {
    if (new Date(points[i]!.ts).getTime() - new Date(points[i - 1]!.ts).getTime() > gapMs) {
      return points.slice(i);
    }
  }
  return points;
}

// Severity dot color — same design tokens OStatusBadge itself uses internally
// (--success/--warning/--destructive), just rendered as a bare dot: a full labeled
// badge is the right call for a status list, but too bulky for a dense multi-column card.
export type Level = "info" | "ok" | "warn" | "crit";
const LEVEL_COLOR: Record<Level, string> = {
  info: "var(--primary)",
  ok: "var(--success)",
  warn: "var(--warning)",
  crit: "var(--destructive)",
};

export type Tile = {
  metric: string;
  label: string;
  group: string; // section header the card is grouped under on the dashboard
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

export const fmtGB = (v: number) => `${(v / 1e9).toFixed(1)} GB`;

export const KEY_METRICS: Tile[] = [
  // Whole-host totals (node_exporter). "整机" = the whole machine incl. non-container
  // processes — vs the per-container "最忙/最大" tiles below which flag a single hot container.
  { metric: "node_cpu_percent", label: "整机 CPU", group: "主机", agg: "avg", meter: true,
    fmt: (v) => `${v.toFixed(0)}%`, level: (v) => (v >= 85 ? "crit" : v >= 60 ? "warn" : "info") },
  { metric: "node_memory_used_percent", label: "整机内存", group: "主机", agg: "avg", meter: true,
    fmt: (v) => `${v.toFixed(0)}%`, level: (v) => (v >= 90 ? "crit" : v >= 75 ? "warn" : "info") },
  { metric: "probe_up", label: "服务在线", group: "主机", agg: "min",
    fmt: (v) => (v >= 1 ? "全部在线" : "有掉线"), level: (v) => (v >= 1 ? "ok" : "crit") },
  { metric: "container_cpu_percent", label: "最忙容器 CPU", group: "容器", agg: "max", showTopSeries: true,
    fmt: (v) => `${v.toFixed(0)}%`, level: (v) => (v >= 1000 ? "crit" : v >= 700 ? "warn" : "info") },
  { metric: "container_memory_working_set_bytes", label: "最大容器内存", group: "容器", agg: "max", showTopSeries: true,
    fmt: fmtGB, level: (v) => (v >= 28e9 ? "crit" : v >= 20e9 ? "warn" : "info") },
  { metric: "container_fs_usage_bytes", label: "磁盘使用", group: "容器", agg: "max",
    fmt: (v) => `${(v / 1e9).toFixed(0)} GB`, level: () => "info" },
  // GPU(唯一物理卡,由 Ollama 网关 §5.2 独占调度) + 网关自身可观测性
  { metric: "nvidia_smi_utilization_gpu_ratio", label: "GPU 利用率", group: "GPU", agg: "avg",
    fmt: (v) => `${(v * 100).toFixed(0)}%`, level: () => "info" },
  { metric: "nvidia_smi_memory_used_bytes", label: "GPU 显存", group: "GPU", agg: "max",
    fmt: fmtGB, level: (v) => (v >= 9.5e9 ? "crit" : v >= 8.5e9 ? "warn" : "info") },
  { metric: "nvidia_smi_temperature_gpu", label: "GPU 温度", group: "GPU", agg: "max",
    fmt: (v) => `${v.toFixed(0)}°C`, level: (v) => (v >= 85 ? "crit" : v >= 75 ? "warn" : "info") },
  { metric: "nvidia_smi_command_exit_code", label: "GPU 驱动健康", group: "GPU", agg: "max",
    fmt: (v) => (v === 0 ? "正常" : "异常"), level: (v) => (v === 0 ? "ok" : "crit") },
  // gpu_lock 是给不经 Ollama 网关、直接摸卡的消费方(ocr-vllm 等)用的互斥闸门——下面两个
  // 网关指标只统计经网关转发的 Ollama 调用,覆盖不到这类直连方,所以单独埋点。
  { metric: "gpu_lock_acquired", label: "GPU锁获取", group: "GPU", agg: "sum",
    fmt: (v) => `${v.toFixed(0)} 次`, level: () => "info" },
  { metric: "gpu_lock_acquire_busy", label: "GPU锁排队拒绝", group: "GPU", agg: "sum",
    fmt: (v) => `${v.toFixed(0)} 次`, level: (v) => (v > 0 ? "warn" : "ok") },
  { metric: "ollama_gateway_requests_busy", label: "网关排队拒绝", group: "网关", agg: "sum",
    fmt: (v) => `${v.toFixed(0)} 次`, level: (v) => (v > 0 ? "warn" : "ok") },
  { metric: "ollama_gateway_requests_error", label: "网关上游错误", group: "网关", agg: "sum",
    fmt: (v) => `${v.toFixed(0)} 次`, level: (v) => (v > 0 ? "crit" : "ok") },
];

// Shared with MetricFrameItem's OWidgetFrame title (page.tsx) — same queryKeys as
// MetricCard's own useQuery calls below, so react-query dedupes them into one request
// per tile/topSeries instead of fetching the same series twice. MetricCard itself no
// longer renders value/topLabel in bare mode (title bar owns them now), so this is the
// only place that reads them for display.
export function useTileTitleInfo(tile: Tile): { value: string | null; topLabel: string | null } {
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
  const value = last !== null ? tile.fmt(last) : null;

  const { data: topSeries } = useQuery<TopSeriesEntry[]>({
    queryKey: ["mtile-top", tile.metric],
    queryFn: () =>
      aegisFetch<TopSeriesEntry[]>(paths.metricsTopSeries({ metric_name: tile.metric, hours: 0.25 })),
    enabled: !!tile.showTopSeries,
    refetchInterval: 30000,
  });
  const topLabel = tile.showTopSeries ? friendlyImageName(topSeries?.[0]?.image ?? null) : null;

  return { value, topLabel };
}

// Compact card. Trend line reuses the library's OSparkline (also what OKPICard uses
// internally) rather than a hand-rolled SVG; the card shell itself stays custom because
// OKPICard's own type scale (2xl–4xl, built for a quarter-width KPI tile) doesn't fit
// this density — the value would render oversized for the space.
//
// `bare`: when the card is the sole content of its own OWidgetFrame (one metric = one
// widget), the frame already draws the border/bg/shadow and shows `tile.label` as its
// title bar — same convention as the total/running/etc KPI cards — so this drops the
// card's own outer box and label row to avoid a "box inside a box" / duplicate label.
export function MetricCard({ tile, onSelect, bare }: { tile: Tile; onSelect: (metric: string) => void; bare?: boolean }) {
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
  const chartPoints = trimToLatestRun(points, data?.bucket_seconds ?? 300);

  // `bare` layout is a CSS grid with an explicit `1fr` middle row for the sparkline —
  // not nested flexbox — so it reliably claims 100% of whatever height the surrounding
  // OWidgetFrame is resized to, rather than shrink-wrapping to the sparkline's own
  // (small, fixed-viewBox) intrinsic content size. `grid-cols-1` matters just as much as
  // the row template: an <svg> is a replaced element, so a percentage width on it is
  // treated as auto during implicit-column track sizing — without an EXPLICIT `1fr`
  // column track, the (only) column shrinks to the svg's intrinsic size instead of
  // filling the row's width.
  return (
    <button
      type="button"
      onClick={() => onSelect(tile.metric)}
      className={
        bare
          ? "grid grid-cols-1 h-full w-full grid-rows-[auto_1fr_auto] gap-1.5 p-1 text-left"
          : "flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--ring)] hover:shadow-md"
      }
    >
      <div className="flex items-center justify-between gap-2">
        {!bare && <span className="truncate text-xs font-medium text-muted-foreground" title={tile.label}>{tile.label}</span>}
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 0 2px color-mix(in oklch, ${color} 20%, transparent)` }}
        />
      </div>

      {/* bare mode: value/topLabel live in the OWidgetFrame's own title bar (see
          useTileTitleInfo + MetricFrameItem in page.tsx), so this is sparkline-only —
          rendered as a direct child of the root grid (its own className carries all the
          sizing), no wrapping row div. Non-bare mode still needs a real flex row since it
          lays out value-column + sparkline side by side. */}
      {bare ? (
        chartPoints.length > 0 && (
          <OSparkline
            values={chartPoints.map((p) => p.value)}
            colorVar={color.replace(/^var\((.+)\)$/, "$1")}
            width="100%"
            height="100%"
            strokeWidth={0.5}
            fill
            className="h-full min-h-0 min-w-0 w-full"
          />
        )
      ) : (
        <div className="flex items-center gap-3">
          <div className="min-w-0 self-center">
            <span className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
              {isLoading && last === null ? "…" : last !== null ? tile.fmt(last) : "—"}
            </span>
          </div>

          {chartPoints.length > 0 && (
            <OSparkline
              values={chartPoints.map((p) => p.value)}
              colorVar={color.replace(/^var\((.+)\)$/, "$1")}
              // '100%' (blocks 4.0.0+) — the <svg> itself gets width/height:100% (stretched
              // via preserveAspectRatio="none" against a fixed internal viewBox, not measured
              // via ResizeObserver), so it needs its direct parent to have a definite box.
              width="100%"
              height="100%"
              strokeWidth={0.5}
              fill
              className="h-12 min-w-0 w-full flex-1"
            />
          )}
        </div>
      )}

      {tile.meter && (
        <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${last !== null ? Math.min(100, Math.max(0, last)) : 0}%`, background: color }}
          />
        </div>
      )}
    </button>
  );
}
