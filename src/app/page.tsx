"use client";

import { useQuery } from "@tanstack/react-query";
import { OKPICard, OHealthBanner, ODataTable } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import type { App, Event } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";

type ColDef<T> = ODataTableData<T>["columns"][number];

const eventColumns: ColDef<Event>[] = [
  { accessorKey: "ts", header: "Time", cell: ({ row }) => new Date(row.original.ts).toLocaleString() },
  { accessorKey: "event_type", header: "Type" },
  { accessorKey: "severity", header: "Severity" },
  { accessorKey: "omodul_kind", header: "Source" },
];

export default function DashboardPage() {
  const apps = useQuery<App[]>({
    queryKey: ["apps"],
    queryFn: () => aegisFetch<App[]>("/api/v1/apps"),
  });

  const events = useQuery<Event[]>({
    queryKey: ["events", "recent"],
    queryFn: () => aegisFetch<Event[]>("/api/v1/events?limit=10"),
  });

  const health = useQuery<{ status: string }>({
    queryKey: ["health"],
    queryFn: () => aegisFetch<{ status: string }>("/health"),
    refetchInterval: 30_000,
  });

  const runningCount = apps.data?.filter((a) => a.status === "running").length ?? 0;
  const totalApps = apps.data?.length ?? 0;

  const healthStatus: "healthy" | "degraded" | "critical" =
    health.error ? "critical" : health.data?.status === "ok" ? "healthy" : "degraded";

  return (
    <div className="space-y-6">
      <OHealthBanner
        status={healthStatus}
        message={
          health.isLoading
            ? "Checking system health…"
            : healthStatus === "healthy"
              ? "All systems operational"
              : "System check failed — check backend connectivity"
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <OKPICard
          data={{ label: "Total Apps", primary: totalApps }}
          loading={apps.isLoading}
        />
        <OKPICard
          data={{ label: "Running Apps", primary: runningCount, indicator: runningCount > 0 ? "up" : "neutral" }}
          loading={apps.isLoading}
        />
        <OKPICard
          data={{ label: "Recent Events", primary: events.data?.length ?? 0 }}
          loading={events.isLoading}
        />
        <OKPICard
          data={{ label: "Health", primary: healthStatus }}
          loading={health.isLoading}
        />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Events</h2>
        <ODataTable<Event>
          data={events.data ? { columns: eventColumns, rows: events.data } : null}
          loading={events.isLoading}
          error={events.error as Error | null}
          empty={events.data?.length === 0}
        />
      </section>
    </div>
  );
}
