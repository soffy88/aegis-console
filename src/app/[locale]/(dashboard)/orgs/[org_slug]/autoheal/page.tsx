"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OStatusBadge } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import type { AutoHealEvent, AutoHealStats } from "@/types/aegis";

type ColDef<T> = ODataTableData<T>["columns"][number];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300",
  warning: "bg-yellow-500/15 text-yellow-300",
  info: "bg-blue-500/15 text-blue-300",
};

export default function AutoHealPage() {
  const t = useTranslations("autoheal");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const stats = useQuery<AutoHealStats>({
    queryKey: ["autoheal-stats", orgId],
    queryFn: () => aegisFetch<AutoHealStats>(paths.autohealStats(orgId!)),
    enabled: !!orgId,
    refetchInterval: 10000,
  });

  const events = useQuery<AutoHealEvent[]>({
    queryKey: ["autoheal-events", orgId],
    queryFn: () => aegisFetch<AutoHealEvent[]>(paths.autohealEvents(orgId!)),
    enabled: !!orgId,
    refetchInterval: 5000,
    meta: {
      onSuccess: () => setLastRefreshed(new Date()),
    },
  });

  const retryMutation = useMutation({
    mutationFn: (eventId: string) =>
      aegisFetch(paths.autohealRetry(orgId!, eventId), { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["autoheal-events", orgId] });
      void qc.invalidateQueries({ queryKey: ["autoheal-stats", orgId] });
    },
  });

  const columns: ColDef<AutoHealEvent>[] = [
    {
      accessorKey: "created_at",
      header: tc("created"),
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => (
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
            SEVERITY_COLORS[row.original.severity] ?? "bg-[var(--muted)] text-[var(--card-foreground)]"
          }`}
        >
          {row.original.severity}
        </span>
      ),
    },
    { accessorKey: "source", header: "Source" },
    { accessorKey: "reason", header: "Reason" },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => (row.original.value !== null ? `${row.original.value.toFixed(1)}%` : "—"),
    },
    {
      accessorKey: "handled",
      header: tc("status"),
      cell: ({ row }) => (
        <OStatusBadge label={row.original.handled ? t("handled") : t("pending")} />
      ),
    },
    {
      accessorKey: "handled_at",
      header: "Handled At",
      cell: ({ row }) =>
        row.original.handled_at ? new Date(row.original.handled_at).toLocaleString() : "—",
    },
    {
      id: "actions",
      header: tc("actions"),
      cell: ({ row }) => (
        <div className="flex gap-2">
          {!row.original.handled && row.original.severity === "critical" && (
            <button
              onClick={() => retryMutation.mutate(row.original.id)}
              disabled={retryMutation.isPending}
              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {t("retry")}
            </button>
          )}
          <button className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)]">
            {tc("details")}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-gray-500">
          Last refreshed: {lastRefreshed.toLocaleTimeString()}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">{t("todayTotal")}</p>
          <p className="mt-1 text-2xl font-bold">{stats.data?.today_total ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">{t("todayHandled")}</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{stats.data?.today_handled ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500 text-red-600">
            {t("pendingCritical")}
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {stats.data?.pending_critical ?? 0}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500 text-orange-600">
            {t("pendingTotal")}
          </p>
          <p className="mt-1 text-2xl font-bold text-orange-600">
            {stats.data?.pending_total ?? 0}
          </p>
        </div>
      </div>

      <ODataTable<AutoHealEvent>
        data={events.data ? { columns, rows: events.data } : null}
        loading={events.isLoading}
        error={events.error as Error | null}
        empty={events.data?.length === 0}
        sortable
      />
    </div>
  );
}
