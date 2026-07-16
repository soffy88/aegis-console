"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OKPICard, OAISummaryCard, OEventTimeline } from "@helios/blocks";
import type { TimelineEvent } from "@helios/blocks";
import { OWidgetGrid, OWidgetFrame, useWidgetStorage } from "@helios/oui";
import type { WidgetLayout } from "@helios/oui";
import type { Container, Event } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import { KEY_METRICS, MetricCard, useTileTitleInfo, type Tile } from "@/components/metrics/key-metric-tiles";
import { GpuLockCard } from "@/components/metrics/gpu-lock-card";

// metric name -> its tile, for the generic `metric-${metric}` item case below.
const METRIC_BY_ID = new Map(KEY_METRICS.map((t) => [t.metric, t]));
const metricIdsForGroup = (group: string) =>
  KEY_METRICS.filter((t) => t.group === group).map((t) => `metric-${t.metric}`);

// A separate component (not inlined in renderItem) so useTileTitleInfo's hook call is
// legal — puts the tile's live value + (for showTopSeries tiles) which container holds
// it in the OWidgetFrame's own title bar ("最大容器内存 · 22.9G · timescaledb") instead
// of MetricCard's bare-mode content, since the frame already owns that title row.
function MetricFrameItem({
  id,
  tile,
  layout,
  updateWidget,
  toggleLock,
  onSelect,
}: {
  id: string;
  tile: Tile;
  layout: WidgetLayout;
  updateWidget: (id: string, patch: Partial<WidgetLayout>) => void;
  toggleLock: (id: string) => void;
  onSelect: (metric: string) => void;
}) {
  const { value, topLabel } = useTileTitleInfo(tile);
  const title = [tile.label, value, topLabel].filter(Boolean).join(" · ");
  return (
    <OWidgetFrame
      id={id}
      title={title}
      locked={layout.locked}
      onLockToggle={toggleLock}
      zoom={layout.zoom}
      colSpan={layout.colSpan}
      rowSpan={layout.rowSpan}
      onZoomChange={(wid, zoom) => updateWidget(wid, { zoom })}
      onClose={(wid) => updateWidget(wid, { visible: false })}
      // oui 2.1.3+: --oui-widget-title-font-size lets us bump this frame's title up
      // from oui.css's default ~11px without an !important hack — these tiles cram
      // more text into the title bar than a plain label, so the default "tag"-sized
      // font reads too small. Applied to every dashboard tile (see other renderItem
      // cases below) for a consistent title size across the whole page, not just
      // metric- tiles.
      className="dash-tile-frame"
    >
      <MetricCard tile={tile} bare onSelect={onSelect} />
    </OWidgetFrame>
  );
}

// Two-level widget nesting: an outer OWidgetGrid holds one category frame per row
// (itself draggable/resizable/lockable — the category title bar is just "主机" etc,
// border/background/shadow stripped via .dash-category-frame so it reads as a plain
// label, not a boxed panel — but it keeps the frame's move/resize so the category
// row order and height stay adjustable), and each category frame contains its own
// inner OWidgetGrid where every card inside is *also* independently
// lockable/draggable/resizable (its own separate useWidgetStorage/localStorage key).
interface CategoryDef {
  id: string;
  title: string;
  itemIds: string[];
  outerRowSpan: number;
  // Custom item layout for categories whose items aren't uniform small KPI cards
  // (autoheal summary / event timeline need much more room than a metric tile).
  customLayout?: (id: string, i: number) => Pick<WidgetLayout, "col" | "row" | "colSpan" | "rowSpan">;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "cat-container",
    title: "容器",
    itemIds: ["total", "running", "abnormal", "events", ...metricIdsForGroup("容器")],
    outerRowSpan: 6,
  },
  {
    id: "cat-host",
    title: "主机",
    itemIds: metricIdsForGroup("主机"),
    outerRowSpan: 4,
  },
  {
    id: "cat-gpu",
    title: "GPU",
    itemIds: ["gpu-lock", ...metricIdsForGroup("GPU")],
    outerRowSpan: 4,
  },
  {
    id: "cat-gateway",
    title: "网关",
    itemIds: metricIdsForGroup("网关"),
    outerRowSpan: 4,
  },
  {
    id: "cat-heal",
    title: "自愈与事件",
    itemIds: ["autoheal", "heal", "timeline"],
    outerRowSpan: 11,
    customLayout: (id) => {
      if (id === "autoheal") return { col: 1, row: 1, colSpan: 12, rowSpan: 2 };
      if (id === "heal") return { col: 1, row: 3, colSpan: 12, rowSpan: 2 };
      return { col: 1, row: 5, colSpan: 12, rowSpan: 5 }; // timeline
    },
  },
];

// Default 4-per-row wrap for uniform small KPI/metric cards (colSpan 3 of 12).
function autoLayout(ids: string[]): WidgetLayout[] {
  return ids.map((id, i) => ({
    id,
    col: (i % 4) * 3 + 1,
    row: 1 + Math.floor(i / 4) * 2,
    colSpan: 3,
    rowSpan: 2,
    zoom: 1,
    visible: true,
    locked: true,
  }));
}

function categoryInitial(cat: CategoryDef): WidgetLayout[] {
  if (cat.customLayout) {
    return cat.itemIds.map((id, i) => ({
      ...cat.customLayout!(id, i),
      id,
      zoom: 1,
      visible: true,
      locked: true,
    }));
  }
  return autoLayout(cat.itemIds);
}

const OUTER_INITIAL: WidgetLayout[] = (() => {
  let row = 1;
  return CATEGORIES.map((cat) => {
    const layout: WidgetLayout = {
      id: cat.id, col: 1, row, colSpan: 12, rowSpan: cat.outerRowSpan,
      zoom: 1, visible: true, locked: true,
    };
    row += cat.outerRowSpan;
    return layout;
  });
})();

interface AutohealStats {
  today_total: number;
  today_handled: number;
  pending_critical: number;
  pending_total: number;
}

// Category id -> i18n key (nav-level titles live in the "dashboard" namespace).
const CAT_TITLE_KEY: Record<string, string> = {
  "cat-container": "catContainer",
  "cat-host": "catHost",
  "cat-gpu": "catGpu",
  "cat-gateway": "catGateway",
  "cat-heal": "catHeal",
};

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const router = useRouter();
  const orgId = useOrgIdBySlug(org_slug);

  // Real-time container view (all host containers) for the headline cards.
  const containers = useQuery<Container[]>({
    queryKey: ["containers", orgId, "dashboard"],
    queryFn: () => aegisFetch<Container[]>(`${paths.containers(orgId!)}?all=true`),
    enabled: !!orgId,
    refetchInterval: 5000,
  });

  const events = useQuery<Event[]>({
    queryKey: ["events", orgId, "recent"],
    queryFn: () => aegisFetch<Event[]>(`${paths.events(orgId!)}?limit=10`),
    enabled: !!orgId,
    refetchInterval: 2000,
  });

  const autohealStats = useQuery<AutohealStats>({
    queryKey: ["autoheal-stats", orgId],
    queryFn: () => aegisFetch<AutohealStats>(paths.autohealStats(orgId!)),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  // Headline cards now reflect real containers (more live than registered apps).
  const cstate = (c: Container) => c.state ?? c.status;
  const totalApps = containers.data?.length ?? 0;
  const runningCount = containers.data?.filter((c) => cstate(c) === "running").length ?? 0;
  const failedCount = containers.data?.filter((c) => cstate(c) !== "running").length ?? 0;
  const eventCount = events.data?.length ?? 0;
  const pendingCritical: number = autohealStats.data?.pending_critical ?? 0;

  const timelineEvents: TimelineEvent[] = (events.data ?? []).map((e) => ({
    id: e.id,
    title: e.event_type,
    time: e.ts,
    subtitle: e.severity ?? undefined,
    status:
      e.severity === "critical" || e.severity === "error"
        ? "failure"
        : e.severity === "warning"
          ? "partial"
          : "success",
  }));

  const healSummary = autohealStats.isLoading
    ? tc("loading")
    : t("healSummary", { count: pendingCritical });

  const outer = useWidgetStorage({ storageKey: "aegis-dashboard", initialLayouts: OUTER_INITIAL });
  // One inner useWidgetStorage per category — fixed, known set, so calling each by name
  // (not in a loop) keeps hook order stable across renders.
  const innerByCategory: Record<string, ReturnType<typeof useWidgetStorage>> = {
    "cat-container": useWidgetStorage({ storageKey: "aegis-dashboard-container", initialLayouts: categoryInitial(CATEGORIES[0]!) }),
    "cat-host": useWidgetStorage({ storageKey: "aegis-dashboard-host", initialLayouts: categoryInitial(CATEGORIES[1]!) }),
    "cat-gpu": useWidgetStorage({ storageKey: "aegis-dashboard-gpu", initialLayouts: categoryInitial(CATEGORIES[2]!) }),
    "cat-gateway": useWidgetStorage({ storageKey: "aegis-dashboard-gateway", initialLayouts: categoryInitial(CATEGORIES[3]!) }),
    "cat-heal": useWidgetStorage({ storageKey: "aegis-dashboard-heal", initialLayouts: categoryInitial(CATEGORIES[4]!) }),
  };

  // Renders one leaf item (KPI card / metric tile / heal summary / timeline) inside
  // whichever inner grid owns it — takes that grid's own updateWidget/toggleLock so the
  // lock/drag/resize/close controls affect only that item within its own category.
  function renderItem(id: string, layout: WidgetLayout, updateWidget: (id: string, patch: Partial<WidgetLayout>) => void, toggleLock: (id: string) => void) {
    const onZoomChange = (wid: string, zoom: number) => updateWidget(wid, { zoom });
    const onClose = (wid: string) => updateWidget(wid, { visible: false });

    if (id.startsWith("metric-")) {
      const tile = METRIC_BY_ID.get(id.slice("metric-".length));
      if (!tile) return null;
      return (
        <MetricFrameItem
          id={id}
          tile={tile}
          layout={layout}
          updateWidget={updateWidget}
          toggleLock={toggleLock}
          onSelect={(m) => router.push(`/orgs/${org_slug}/metrics?metric=${m}`)}
        />
      );
    }

    switch (id) {
      case "gpu-lock":
        return (
          <OWidgetFrame id={id} title={t("gpuUsage")} locked={layout.locked} onLockToggle={toggleLock} zoom={layout.zoom} colSpan={layout.colSpan} rowSpan={layout.rowSpan} onZoomChange={onZoomChange} onClose={onClose} className="dash-tile-frame">
            <GpuLockCard bare />
          </OWidgetFrame>
        );
      case "total":
        return (
          <OWidgetFrame id={id} title={t("totalApps")} locked={layout.locked} onLockToggle={toggleLock} zoom={layout.zoom} colSpan={layout.colSpan} rowSpan={layout.rowSpan} onZoomChange={onZoomChange} onClose={onClose} className="dash-tile-frame">
            <OKPICard data={{ label: "", primary: totalApps }} loading={containers.isLoading} variant="compact" className="!border-0 !shadow-none !bg-transparent" />
          </OWidgetFrame>
        );
      case "running":
        return (
          <OWidgetFrame id={id} title={t("running")} locked={layout.locked} onLockToggle={toggleLock} zoom={layout.zoom} colSpan={layout.colSpan} rowSpan={layout.rowSpan} onZoomChange={onZoomChange} onClose={onClose} className="dash-tile-frame">
            <OKPICard data={{ label: "", primary: runningCount, indicator: "up" }} loading={containers.isLoading} variant="compact" className="!border-0 !shadow-none !bg-transparent" />
          </OWidgetFrame>
        );
      case "abnormal":
        return (
          <OWidgetFrame id={id} title={t("failed")} locked={layout.locked} onLockToggle={toggleLock} zoom={layout.zoom} colSpan={layout.colSpan} rowSpan={layout.rowSpan} onZoomChange={onZoomChange} onClose={onClose} className="dash-tile-frame">
            <OKPICard
              data={{ label: "", primary: failedCount, indicator: failedCount > 0 ? "down" : "neutral" }}
              loading={containers.isLoading}
              variant="compact"
              className="!border-0 !shadow-none !bg-transparent"
            />
          </OWidgetFrame>
        );
      case "events":
        return (
          <OWidgetFrame id={id} title={t("events1h")} locked={layout.locked} onLockToggle={toggleLock} zoom={layout.zoom} colSpan={layout.colSpan} rowSpan={layout.rowSpan} onZoomChange={onZoomChange} onClose={onClose} className="dash-tile-frame">
            <OKPICard data={{ label: "", primary: eventCount }} loading={events.isLoading} variant="compact" className="!border-0 !shadow-none !bg-transparent" />
          </OWidgetFrame>
        );
      case "autoheal":
        return (
          <OWidgetFrame id={id} title={t("healPending")} locked={layout.locked} onLockToggle={toggleLock} zoom={layout.zoom} colSpan={layout.colSpan} rowSpan={layout.rowSpan} onZoomChange={onZoomChange} onClose={onClose} className="dash-tile-frame">
            <OKPICard
              data={{ label: "", primary: autohealStats.isLoading ? "…" : pendingCritical, indicator: pendingCritical > 0 ? "down" : "neutral" }}
              loading={autohealStats.isLoading}
              variant="compact"
              className="!border-0 !shadow-none !bg-transparent"
            />
          </OWidgetFrame>
        );
      case "heal":
        return (
          <OWidgetFrame id={id} title={t("healStatus")} locked={layout.locked} onLockToggle={toggleLock} zoom={layout.zoom} colSpan={layout.colSpan} rowSpan={layout.rowSpan} onZoomChange={onZoomChange} onClose={onClose} className="dash-tile-frame">
            <OAISummaryCard summary={healSummary} newSubstrates={pendingCritical} className="!border-0 !shadow-none !bg-transparent" />
          </OWidgetFrame>
        );
      case "timeline":
        return (
          <OWidgetFrame id={id} title={t("eventStream")} locked={layout.locked} onLockToggle={toggleLock} zoom={layout.zoom} colSpan={layout.colSpan} rowSpan={layout.rowSpan} onZoomChange={onZoomChange} onClose={onClose} className="dash-tile-frame">
            <OEventTimeline events={timelineEvents} emptyMessage={t("noEvents")} className="!border-0 !shadow-none !bg-transparent" />
          </OWidgetFrame>
        );
      default:
        return null;
    }
  }

  const loadError = containers.error || events.error || autohealStats.error;

  return (
    <div className="space-y-4">
      {loadError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {tc("error")}: {(loadError as Error).message}
        </p>
      )}
      {/* colWidth=72 matches rowHeight so drag/resize snaps to ~72px in both axes —
          without it, horizontal snap falls back to the responsive 12-col default
          (~80-100px/col), a coarser step than the vertical one. */}
      <OWidgetGrid widgets={outer.widgets} onWidgetChange={outer.updateWidget} gridCols={12} colWidth={72} rowHeight={72} gap={12}>
        {({ id: categoryId, layout: catLayout }) => {
          if (!catLayout.visible) return null;
          const cat = CATEGORIES.find((c) => c.id === categoryId);
          if (!cat) return null;
          const inner = innerByCategory[cat.id]!;

          return (
            <OWidgetFrame
              id={categoryId}
              title={t(CAT_TITLE_KEY[cat.id] ?? cat.title)}
              locked={catLayout.locked}
              onLockToggle={outer.toggleLock}
              zoom={catLayout.zoom}
              colSpan={catLayout.colSpan}
              rowSpan={catLayout.rowSpan}
              onZoomChange={(wid, zoom) => outer.updateWidget(wid, { zoom })}
              onClose={(wid) => outer.updateWidget(wid, { visible: false })}
              // See .dash-category-frame in globals.css: strips border/background/shadow
              // so this reads as a plain "主机" label, not a boxed panel — but keeps the
              // frame itself (title bar drag handle, resize handle, lock toggle) so the
              // category row is still movable/resizable, just invisible until you touch it.
              className="dash-category-frame"
            >
              <div className="p-2">
                <OWidgetGrid widgets={inner.widgets} onWidgetChange={inner.updateWidget} gridCols={12} colWidth={72} rowHeight={72} gap={8}>
                  {({ id: itemId, layout: itemLayout }) => {
                    if (!itemLayout.visible) return null;
                    return renderItem(itemId, itemLayout, inner.updateWidget, inner.toggleLock);
                  }}
                </OWidgetGrid>
              </div>
            </OWidgetFrame>
          );
        }}
      </OWidgetGrid>
    </div>
  );
}
