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
import { TRANSITIONAL_APP_STATUSES as TRANSITIONAL } from "@/lib/app-status";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-3.5 w-3.5 animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

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
  const t = useTranslations("apps");
  const qc = useQueryClient();
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const transitional = TRANSITIONAL.has(app.status);

  const { data: stats } = useQuery<ContainerStats>({
    queryKey: ["container-stats", orgId, app.app_name],
    queryFn: () => aegisFetch<ContainerStats>(`${paths.container(orgId, app.app_name)}/stats`),
    refetchInterval: 3000,
    enabled: app.status === "running" || app.status === "completed",
  });

  const action = useMutation({
    mutationFn: (path: string) => aegisFetch(path, { method: "POST" }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["apps", orgId] });
      void qc.invalidateQueries({ queryKey: ["container-stats", orgId, app.app_name] });
    },
  });

  useEffect(() => {
    if (stats) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCpuHistory((prev) => [...prev.slice(-99), stats.cpu_pct]);
    }
  }, [stats]);

  const btn =
    "rounded-md border border-[var(--border)] px-2 py-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)] disabled:opacity-50 disabled:pointer-events-none";

  return (
    <div className="rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <Link href={`/orgs/${orgSlug}/apps/${app.id}`} className="font-semibold hover:underline">
          {app.app_name}
        </Link>
        <span className="flex items-center gap-1.5">
          {transitional && <Spinner className="text-[var(--muted-foreground)]" />}
          <OStatusBadge label={app.status} />
        </span>
      </div>

      {transitional && (
        <p className="text-xs text-[var(--muted-foreground)]">{t("transitionalHint")}</p>
      )}

      {stats && (
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div>CPU <span className="font-mono text-foreground">{stats.cpu_pct}%</span></div>
          <div>Mem <span className="font-mono text-foreground">{stats.mem_mb}MB</span></div>
          <div>Net <span className="font-mono text-foreground">{stats.net_rx_kb}kB</span></div>
        </div>
      )}

      {cpuHistory.length > 1 && <MiniSparkline points={cpuHistory} />}

      {action.isError && (
        <p className="text-xs text-destructive">{(action.error as Error).message}</p>
      )}

      <div className="flex gap-2 text-xs">
        <button disabled={action.isPending} onClick={() => action.mutate(paths.containerStart(orgId, app.app_name))} className={btn}>start</button>
        <button disabled={action.isPending} onClick={() => action.mutate(paths.containerStop(orgId, app.app_name))} className={btn}>stop</button>
        <button disabled={action.isPending} onClick={() => action.mutate(paths.containerRestart(orgId, app.app_name))} className={btn}>restart</button>
        <Link href={`/orgs/${orgSlug}/apps/${app.id}`} className={`${btn} ml-auto`}>
          details
        </Link>
      </div>
    </div>
  );
}

export default function AppsPage() {
  const t = useTranslations("apps");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const { data, isLoading, error } = useQuery<App[]>({
    queryKey: ["apps", orgId],
    queryFn: () => aegisFetch<App[]>(paths.apps(orgId!)),
    enabled: !!orgId,
    // Poll while any app is still settling so the UI reflects progress on its own.
    refetchInterval: (q) =>
      q.state.data?.some((a) => TRANSITIONAL.has(a.status)) ? 3000 : false,
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
      {isLoading && <p className="text-sm text-[var(--muted-foreground)]">{tc("loading")}</p>}
      {error && <p className="text-sm text-destructive">{tc("error")}: {(error as Error).message}</p>}
      {!isLoading && !error && data?.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">{t("noApps")}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((app) => (
          <AppCard key={app.id} app={app} orgId={orgId ?? ""} orgSlug={org_slug} />
        ))}
      </div>
    </div>
  );
}
