"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OStatusBadge, OConfirmDialog } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import { usePermission } from "@/lib/auth/use-permission";
import type { AutoHealEvent, AutoHealStats, KillSwitchState } from "@/types/aegis";

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
  const { canAdmin } = usePermission();
  const qc = useQueryClient();
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [killReason, setKillReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmKill, setConfirmKill] = useState(false);

  const killSwitch = useQuery<KillSwitchState>({
    queryKey: ["autoheal-kill-switch", orgId],
    queryFn: () => aegisFetch<KillSwitchState>(paths.autohealKillSwitch(orgId!)),
    enabled: !!orgId,
    refetchInterval: 10000,
  });

  const killSwitchMutation = useMutation({
    mutationFn: (next: boolean) =>
      aegisFetch<KillSwitchState>(paths.autohealKillSwitch(orgId!), {
        method: "PUT",
        body: JSON.stringify({ enabled: next, reason: killReason || null }),
      }),
    onSuccess: (data) => {
      setActionError(null);
      qc.setQueryData(["autoheal-kill-switch", orgId], data);
      setKillReason("");
    },
    onError: (e: Error) => setActionError(e.message),
  });

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
      header: t("severity"),
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
    { accessorKey: "source", header: t("source") },
    { accessorKey: "reason", header: t("reason") },
    {
      accessorKey: "value",
      header: t("value"),
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
      header: t("handledAt"),
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
              className="rounded bg-[var(--primary)] px-2 py-1 text-xs text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
            >
              {t("retry")}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("lastRefreshed")}: {lastRefreshed.toLocaleTimeString()}
        </p>
      </div>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div
        className={`rounded-xl border p-4 shadow-sm ${
          killSwitch.data?.enabled
            ? "border-red-500/40 bg-red-500/10"
            : "border-[var(--border)] bg-card"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{t("killSwitch")}</p>
            <p className="text-sm text-muted-foreground">{t("killSwitchHint")}</p>
            <p
              className={`mt-1 text-sm font-medium ${
                killSwitch.data?.enabled ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {killSwitch.data?.enabled ? t("killSwitchActive") : t("killSwitchInactive")}
            </p>
            {killSwitch.data?.reason && (
              <p className="text-xs text-muted-foreground">{killSwitch.data.reason}</p>
            )}
            {killSwitch.data?.updated_at && (
              <p className="text-xs text-muted-foreground">
                {t("killSwitchUpdatedAt")}: {new Date(killSwitch.data.updated_at).toLocaleString()}
              </p>
            )}
          </div>
          {canAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              {!killSwitch.data?.enabled && (
                <input
                  value={killReason}
                  onChange={(e) => setKillReason(e.target.value)}
                  placeholder={t("killSwitchReasonPlaceholder")}
                  className="w-56 rounded border bg-background px-2 py-1.5 text-sm"
                />
              )}
              <button
                onClick={() => setConfirmKill(true)}
                disabled={killSwitchMutation.isPending || killSwitch.isLoading}
                className={`rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                  killSwitch.data?.enabled
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {killSwitch.data?.enabled ? t("killSwitchDisengage") : t("killSwitchEngage")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("todayTotal")}</p>
          <p className="mt-1 text-2xl font-bold">{stats.data?.today_total ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("handledRate")}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {(() => {
              const tt = stats.data?.today_total ?? 0;
              const th = stats.data?.today_handled ?? 0;
              return tt > 0 ? `${Math.round((th / tt) * 100)}%` : "—";
            })()}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("pendingCritical")}</p>
          <p className={`mt-1 text-2xl font-bold ${(stats.data?.pending_critical ?? 0) > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {stats.data?.pending_critical ?? 0}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("pendingTotal")}</p>
          <p className={`mt-1 text-2xl font-bold ${(stats.data?.pending_total ?? 0) > 0 ? "text-amber-400" : ""}`}>
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

      <OConfirmDialog
        open={confirmKill}
        title={t("killSwitchConfirmTitle")}
        description={
          killSwitch.data?.enabled
            ? t("killSwitchDisengageConfirm")
            : t("killSwitchEngageConfirm")
        }
        danger={!killSwitch.data?.enabled}
        confirmLabel={killSwitch.data?.enabled ? t("killSwitchDisengage") : t("killSwitchEngage")}
        onConfirm={() => {
          killSwitchMutation.mutate(!killSwitch.data?.enabled);
          setConfirmKill(false);
        }}
        onCancel={() => setConfirmKill(false)}
      />
    </div>
  );
}
