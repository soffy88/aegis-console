"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { OStatusBadge } from "@helios/blocks";
import type { App } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { useRef } from "react";

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

function AppCard({ app }: { app: App }) {
  const cpuHistory = useRef<number[]>([]);

  const { data: stats } = useQuery<ContainerStats>({
    queryKey: ["container-stats", app.app_name],
    queryFn: () => aegisFetch<ContainerStats>(`/api/v1/docker/containers/${app.app_name}/stats`),
    refetchInterval: 3000,
    enabled: app.status === "running" || app.status === "completed",
  });

  if (stats) {
    cpuHistory.current = [...cpuHistory.current.slice(-99), stats.cpu_pct];
  }

  return (
    <div className="rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <Link href={`/apps/${app.id}`} className="font-semibold hover:underline">
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

      {cpuHistory.current.length > 1 && <MiniSparkline points={cpuHistory.current} />}

      <div className="flex gap-2 text-xs">
        <button
          onClick={() => aegisFetch(`/api/v1/docker/containers/${app.app_name}/start`, { method: "POST" })}
          className="rounded bg-green-100 px-2 py-1 hover:bg-green-200"
        >start</button>
        <button
          onClick={() => aegisFetch(`/api/v1/docker/containers/${app.app_name}/stop`, { method: "POST" })}
          className="rounded bg-yellow-100 px-2 py-1 hover:bg-yellow-200"
        >stop</button>
        <button
          onClick={() => aegisFetch(`/api/v1/docker/containers/${app.app_name}/restart`, { method: "POST" })}
          className="rounded bg-orange-100 px-2 py-1 hover:bg-orange-200"
        >restart</button>
        <Link href={`/apps/${app.id}`} className="rounded bg-gray-100 px-2 py-1 hover:bg-gray-200 ml-auto">
          details
        </Link>
      </div>
    </div>
  );
}

export default function AppsPage() {
  const { data, isLoading, error } = useQuery<App[]>({
    queryKey: ["apps"],
    queryFn: () => aegisFetch<App[]>("/api/v1/apps"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Apps</h1>
        <Link
          href="/apps/install"
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Install App
        </Link>
      </div>
      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-600">Error: {(error as Error).message}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((app) => <AppCard key={app.id} app={app} />)}
      </div>
    </div>
  );
}
