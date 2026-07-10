"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OStatusBadge } from "@helios/blocks";
import { useState, useEffect } from "react";
import type { App } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

interface ContainerStats {
  container: string;
  cpu_pct: number;
  mem_mb: number;
  mem_limit_mb: number;
  net_rx_kb: number;
  net_tx_kb: number;
}

function MiniSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const w = 80, h = 24;
  const d = points
    .map((v, i) => `${(i / (points.length - 1)) * w},${h - (v / max) * h}`)
    .join(" L ");
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-500" />
    </svg>
  );
}

function AppCard({ app, orgId, orgSlug }: { app: App; orgId: string; orgSlug: string }) {
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: stats } = useQuery<ContainerStats>({
    queryKey: ["container-stats", orgId, app.app_name],
    queryFn: () => aegisFetch<ContainerStats>(`${paths.container(orgId, app.app_name)}/stats`),
    refetchInterval: 3000,
    enabled: app.status === "running" || app.status === "completed",
  });

  const actionMutation = useMutation({
    mutationFn: (action: "start" | "stop" | "restart") => {
      const path =
        action === "start"
          ? paths.containerStart(orgId, app.app_name)
          : action === "stop"
            ? paths.containerStop(orgId, app.app_name)
            : paths.containerRestart(orgId, app.app_name);
      return aegisFetch(path, { method: "POST" });
    },
    onSuccess: () => {
      setActionError(null);
      void qc.invalidateQueries({ queryKey: ["apps", orgId] });
    },
    onError: (e: Error) => setActionError(e.message),
  });

  useEffect(() => {
    if (stats) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCpuHistory((prev) => [...prev.slice(-99), stats.cpu_pct]);
    }
  }, [stats]);

  return (
    <div className="rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <Link href={`/orgs/${orgSlug}/apps/${app.id}`} className="font-semibold hover:underline">
          {app.app_name}
        </Link>
        <OStatusBadge label={app.status} />
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div>CPU <span className="font-mono text-foreground">{stats.cpu_pct}%</span></div>
          <div>Mem <span className="font-mono text-foreground">{stats.mem_mb}MB</span></div>
          <div>Net <span className="font-mono text-foreground">{stats.net_rx_kb}kB</span></div>
        </div>
      )}

      {cpuHistory.length > 1 && <MiniSparkline points={cpuHistory} />}

      <div className="flex gap-2 text-xs">
        <button
          onClick={() => actionMutation.mutate("start")}
          disabled={actionMutation.isPending}
          className="rounded-md border border-[var(--border)] px-2 py-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)] disabled:opacity-50"
        >start</button>
        <button
          onClick={() => actionMutation.mutate("stop")}
          disabled={actionMutation.isPending}
          className="rounded-md border border-[var(--border)] px-2 py-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)] disabled:opacity-50"
        >stop</button>
        <button
          onClick={() => actionMutation.mutate("restart")}
          disabled={actionMutation.isPending}
          className="rounded-md border border-[var(--border)] px-2 py-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)] disabled:opacity-50"
        >restart</button>
        <Link href={`/orgs/${orgSlug}/apps/${app.id}`} className="rounded-md border border-[var(--border)] px-2 py-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)] ml-auto">
          details
        </Link>
      </div>
      {actionError && <p className="text-xs text-red-600">{actionError}</p>}
    </div>
  );
}

export default function AppsPage() {
  const t = useTranslations("apps");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const { data, isLoading, error } = useQuery<App[]>({
    queryKey: ["apps", orgId],
    queryFn: () => aegisFetch<App[]>(paths.apps(orgId!)),
    enabled: !!orgId,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href={`/orgs/${org_slug}/apps/install`}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {t("install")}
        </Link>
      </div>
      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-600">Error: {(error as Error).message}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((app) => (
          <AppCard key={app.id} app={app} orgId={orgId ?? ""} orgSlug={org_slug} />
        ))}
      </div>
    </div>
  );
}
