"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OKPICard, OAISummaryCard, OEventTimeline } from "@helios/blocks";
import type { TimelineEvent } from "@helios/blocks";
import { OWidgetGrid, OWidgetFrame, useWidgetStorage } from "@helios/oui";
import type { WidgetLayout } from "@helios/oui";
import type { App, Event } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

const INITIAL: WidgetLayout[] = [
  { id: "total",    col: 1,  row: 1, colSpan: 3, rowSpan: 2, zoom: 1, visible: true, locked: true },
  { id: "running",  col: 4,  row: 1, colSpan: 3, rowSpan: 2, zoom: 1, visible: true, locked: true },
  { id: "abnormal", col: 7,  row: 1, colSpan: 3, rowSpan: 2, zoom: 1, visible: true, locked: true },
  { id: "events",   col: 10, row: 1, colSpan: 3, rowSpan: 2, zoom: 1, visible: true, locked: true },
  { id: "heal",     col: 1,  row: 3, colSpan: 6, rowSpan: 3, zoom: 1, visible: true, locked: true },
  { id: "timeline", col: 7,  row: 3, colSpan: 6, rowSpan: 3, zoom: 1, visible: true, locked: true },
];

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const apps = useQuery<App[]>({
    queryKey: ["apps", orgId],
    queryFn: () => aegisFetch<App[]>(paths.apps(orgId!)),
    enabled: !!orgId,
  });

  const events = useQuery<Event[]>({
    queryKey: ["events", orgId, "recent"],
    queryFn: () => aegisFetch<Event[]>(`${paths.events(orgId!)}?limit=10`),
    enabled: !!orgId,
    refetchInterval: 2000,
  });

  const autohealStats = useQuery<any>({
    queryKey: ["autoheal-stats", orgId],
    queryFn: () => aegisFetch<any>(paths.autohealStats(orgId!)),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const totalApps = apps.data?.length ?? 0;
  const runningCount =
    apps.data?.filter((a) => a.status === "running" || a.status === "completed").length ?? 0;
  const failedCount = apps.data?.filter((a) => a.status === "failed").length ?? 0;
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
    ? "加载中..."
    : `待处理严重告警 ${pendingCritical} 条${pendingCritical > 0 ? "，请及时处理。" : "，系统运行正常。"}`;

  const { widgets, updateWidget, toggleLock } = useWidgetStorage({
    storageKey: "aegis-dashboard",
    initialLayouts: INITIAL,
  });

  return (
    <OWidgetGrid
      widgets={widgets}
      onWidgetChange={updateWidget}
      gridCols={12}
      rowHeight={72}
      gap={12}
    >
      {({ id, layout }) => {
        if (!layout.visible) return null;
        const onZoomChange = (wid: string, zoom: number) => updateWidget(wid, { zoom });
        const onClose = (wid: string) => updateWidget(wid, { visible: false });

        switch (id) {
          case "total":
            return (
              <OWidgetFrame
                id={id}
                title={t("totalApps")}
                locked={layout.locked}
                onLockToggle={toggleLock}
                zoom={layout.zoom}
                colSpan={layout.colSpan}
                rowSpan={layout.rowSpan}
                onZoomChange={onZoomChange}
                onClose={onClose}
              >
                <OKPICard
                  data={{ label: "", primary: totalApps }}
                  loading={apps.isLoading}
                  variant="compact"
                />
              </OWidgetFrame>
            );
          case "running":
            return (
              <OWidgetFrame
                id={id}
                title={t("running")}
                locked={layout.locked}
                onLockToggle={toggleLock}
                zoom={layout.zoom}
                colSpan={layout.colSpan}
                rowSpan={layout.rowSpan}
                onZoomChange={onZoomChange}
                onClose={onClose}
              >
                <OKPICard
                  data={{ label: "", primary: runningCount, indicator: "up" }}
                  loading={apps.isLoading}
                  variant="compact"
                />
              </OWidgetFrame>
            );
          case "abnormal":
            return (
              <OWidgetFrame
                id={id}
                title={t("failed")}
                locked={layout.locked}
                onLockToggle={toggleLock}
                zoom={layout.zoom}
                colSpan={layout.colSpan}
                rowSpan={layout.rowSpan}
                onZoomChange={onZoomChange}
                onClose={onClose}
              >
                <OKPICard
                  data={{
                    label: "",
                    primary: failedCount,
                    indicator: failedCount > 0 ? "down" : "neutral",
                  }}
                  loading={apps.isLoading}
                  variant="compact"
                />
              </OWidgetFrame>
            );
          case "events":
            return (
              <OWidgetFrame
                id={id}
                title={t("events1h")}
                locked={layout.locked}
                onLockToggle={toggleLock}
                zoom={layout.zoom}
                colSpan={layout.colSpan}
                rowSpan={layout.rowSpan}
                onZoomChange={onZoomChange}
                onClose={onClose}
              >
                <OKPICard
                  data={{ label: "", primary: eventCount }}
                  loading={events.isLoading}
                  variant="compact"
                />
              </OWidgetFrame>
            );
          case "heal":
            return (
              <OWidgetFrame
                id={id}
                title="自愈状态"
                locked={layout.locked}
                onLockToggle={toggleLock}
                zoom={layout.zoom}
                colSpan={layout.colSpan}
                rowSpan={layout.rowSpan}
                onZoomChange={onZoomChange}
                onClose={onClose}
              >
                <OAISummaryCard
                  summary={healSummary}
                  newSubstrates={pendingCritical}
                  className="!border-0 !shadow-none !bg-transparent"
                />
              </OWidgetFrame>
            );
          case "timeline":
            return (
              <OWidgetFrame
                id={id}
                title={t("eventStream")}
                locked={layout.locked}
                onLockToggle={toggleLock}
                zoom={layout.zoom}
                colSpan={layout.colSpan}
                rowSpan={layout.rowSpan}
                onZoomChange={onZoomChange}
                onClose={onClose}
              >
                <OEventTimeline
                  events={timelineEvents}
                  emptyMessage="暂无事件"
                  className="!border-0 !shadow-none !bg-transparent"
                />
              </OWidgetFrame>
            );
          default:
            return null;
        }
      }}
    </OWidgetGrid>
  );
}
