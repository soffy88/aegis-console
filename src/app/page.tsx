"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { OKPICard, OHealthBanner, ODataTable, OStatusBadge } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import type { App, Event, Project } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";

type ColDef<T> = ODataTableData<T>["columns"][number];

const eventColumns: ColDef<Event>[] = [
  { accessorKey: "ts", header: "Time", cell: ({ row }) => new Date(row.original.ts).toLocaleString() },
  { accessorKey: "event_type", header: "Type" },
  { accessorKey: "severity", header: "Severity" },
];

export default function DashboardPage() {
  const apps = useQuery<App[]>({
    queryKey: ["apps"],
    queryFn: () => aegisFetch<App[]>("/api/v1/apps"),
  });

  const events = useQuery<Event[]>({
    queryKey: ["events", "recent"],
    queryFn: () => aegisFetch<Event[]>("/api/v1/events?limit=10"),
    refetchInterval: 2000,
  });

  const health = useQuery<{ status: string }>({
    queryKey: ["health"],
    queryFn: () => aegisFetch<{ status: string }>("/health"),
    refetchInterval: 30_000,
  });

  const projects = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => aegisFetch<Project[]>("/api/v1/projects"),
    refetchInterval: 30_000,
  });

  const totalApps = apps.data?.length ?? 0;
  const runningCount = apps.data?.filter((a) => a.status === "running" || a.status === "completed").length ?? 0;
  const failedCount = apps.data?.filter((a) => a.status === "failed").length ?? 0;

  const healthStatus: "healthy" | "degraded" | "critical" =
    health.error ? "critical" : health.data?.status === "ok" ? "healthy" : "degraded";

  return (
    <div className="space-y-6">
      <OHealthBanner
        status={healthStatus}
        message={healthStatus === "healthy" ? "All systems operational" : "System check failed"}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="kpi-row">
        <OKPICard data={{ label: "Total Apps", primary: totalApps }} loading={apps.isLoading} />
        <OKPICard data={{ label: "Running", primary: runningCount, indicator: "up" }} loading={apps.isLoading} />
        <OKPICard data={{ label: "Failed", primary: failedCount, indicator: failedCount > 0 ? "down" : "neutral" }} loading={apps.isLoading} />
        <OKPICard data={{ label: "Events (1h)", primary: events.data?.length ?? 0 }} loading={events.isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* App Grid - 2 cols */}
        <section className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold">Applications</h2>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" data-testid="app-grid">
            {apps.data?.map((app) => (
              <Link key={app.id} href={`/apps/${app.id}`} className="flex items-center gap-2 rounded border p-2 hover:bg-muted text-sm">
                <OStatusBadge label={app.status} />
                <span className="font-medium truncate">{app.app_name}</span>
              </Link>
            ))}
          </div>

          {/* Event Stream */}
          <h2 className="text-lg font-semibold pt-4">Event Stream</h2>
          <ODataTable<Event>
            data={events.data ? { columns: eventColumns, rows: events.data } : null}
            loading={events.isLoading}
            error={events.error as Error | null}
            empty={events.data?.length === 0}
          />
        </section>

        {/* Project Health Panel - 1 col */}
        <aside className="space-y-3" data-testid="project-health-panel">
          <h2 className="text-lg font-semibold">Project Health</h2>
          {projects.data?.length === 0 && <p className="text-sm text-muted-foreground">No projects discovered</p>}
          {projects.data?.map((p) => (
            <Link key={p.name} href={`/projects/${p.name}`} className="flex items-center justify-between rounded border p-2 hover:bg-muted">
              <span className="text-sm font-medium">{p.name}</span>
              <OStatusBadge label={p.status} />
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}
