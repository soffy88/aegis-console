"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OKPICard, OHealthBanner, ODataTable, OStatusBadge } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import type { App, Event, Project } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type ColDef<T> = ODataTableData<T>["columns"][number];

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const eventColumns: ColDef<Event>[] = [
    { accessorKey: "ts", header: t("time"), cell: ({ row }) => new Date(row.original.ts).toLocaleString() },
    { accessorKey: "event_type", header: t("type") },
    { accessorKey: "severity", header: t("severity") },
  ];

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

  const health = useQuery<{ status: string }>({
    queryKey: ["health"],
    queryFn: () => aegisFetch<{ status: string }>(paths.health()),
    refetchInterval: 30_000,
  });

  const projects = useQuery<Project[]>({
    queryKey: ["projects", orgId],
    queryFn: () => aegisFetch<Project[]>(paths.projects(orgId!)),
    enabled: !!orgId,
    refetchInterval: 30_000,
  });

  const totalApps = apps.data?.length ?? 0;
  const runningCount =
    apps.data?.filter((a) => a.status === "running" || a.status === "completed").length ?? 0;
  const failedCount = apps.data?.filter((a) => a.status === "failed").length ?? 0;

  const autohealStats = useQuery<any>({
    queryKey: ["autoheal-stats", orgId],
    queryFn: () => aegisFetch<any>(paths.autohealStats(orgId!)),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const healthStatus: "healthy" | "degraded" | "critical" = health.isLoading
    ? "healthy"
    : health.error
      ? "critical"
      : health.data?.status === "ok"
        ? "healthy"
        : "degraded";

  const hasPendingCritical = (autohealStats.data?.pending_critical ?? 0) > 0;

  return (
    <div className="space-y-6">
      <OHealthBanner
        status={healthStatus}
        message={healthStatus === "healthy" ? t("allSystemsOk") : "System check failed"}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5" data-testid="kpi-row">
        <OKPICard data={{ label: t("totalApps"), primary: totalApps }} loading={apps.isLoading} />
        <OKPICard
          data={{ label: t("running"), primary: runningCount, indicator: "up" }}
          loading={apps.isLoading}
        />
        <OKPICard
          data={{
            label: t("failed"),
            primary: failedCount,
            indicator: failedCount > 0 ? "down" : "neutral",
          }}
          loading={apps.isLoading}
        />
        <OKPICard
          data={{ label: t("events1h"), primary: events.data?.length ?? 0 }}
          loading={events.isLoading}
        />
        <div
          className={`rounded border bg-white p-3 shadow-sm ${
            hasPendingCritical ? "border-red-500 ring-1 ring-red-500" : ""
          }`}
        >
          <p className="text-xs font-semibold uppercase text-gray-500 truncate">自愈状态</p>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-red-600">
              {autohealStats.data?.pending_critical ?? 0}
            </p>
            <Link
              href={`/orgs/${org_slug}/autoheal`}
              className="text-[10px] text-blue-600 hover:underline"
            >
              查看详情
            </Link>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">待处理严重告警</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold">{t("applications")}</h2>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" data-testid="app-grid">
            {apps.data?.map((app) => (
              <Link key={app.id} href={`/orgs/${org_slug}/apps/${app.id}`} className="flex items-center gap-2 rounded border p-2 hover:bg-muted text-sm">
                <OStatusBadge label={app.status} />
                <span className="font-medium truncate">{app.app_name}</span>
              </Link>
            ))}
          </div>

          <h2 className="text-lg font-semibold pt-4">{t("eventStream")}</h2>
          <ODataTable<Event>
            data={events.data ? { columns: eventColumns, rows: events.data } : null}
            loading={events.isLoading}
            error={events.error as Error | null}
            empty={events.data?.length === 0}
          />
        </section>

        <aside className="space-y-3" data-testid="project-health-panel">
          <h2 className="text-lg font-semibold">Projects</h2>
          {projects.data?.length === 0 && <p className="text-sm text-muted-foreground">No projects found</p>}
          {projects.data?.map((p) => (
            <Link key={p.id} href={`/orgs/${org_slug}/projects/${p.slug}`} className="flex items-center justify-between rounded border p-2 hover:bg-muted">
              <span className="text-sm font-medium">{p.display_name}</span>
              <span className="text-xs text-muted-foreground">{p.environment}</span>
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}
