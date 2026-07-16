"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { OJsonViewer, OConfirmDialog, OLogsViewer } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import { getValidToken } from "@/lib/auth/token-store";
import type { ContainerExecResult } from "@/types/aegis";

const ContainerTerminal = dynamic(
  () => import("@/components/ContainerTerminal").then((m) => m.ContainerTerminal),
  { ssr: false },
);

type Action = "start" | "stop" | "restart" | null;

const TRANSITIONAL_STATUSES = ["restarting", "removing", "created"];

function inspectStatus(data: Record<string, unknown> | undefined): string | undefined {
  if (!data) return undefined;
  const state = data["State"] as { Status?: string } | undefined;
  return state?.Status ?? (data["status"] as string | undefined);
}

interface ContainerStats {
  cpu_pct?: number;
  mem_mb?: number;
  mem_limit_mb?: number;
  net_rx_kb?: number;
  net_tx_kb?: number;
}

export default function ContainerPage() {
  const t = useTranslations("containers");
  const tc = useTranslations("common");
  const { org_slug, name } = useParams<{ org_slug: string; name: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const [pendingAction, setPendingAction] = useState<Action>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [execCommand, setExecCommand] = useState("");
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string>("");

  const inspect = useQuery<Record<string, unknown>>({
    queryKey: ["container", orgId, name, "inspect"],
    queryFn: () => aegisFetch<Record<string, unknown>>(paths.container(orgId!, name)),
    enabled: !!orgId,
    refetchInterval: (q) => {
      const s = inspectStatus(q.state.data);
      return s && TRANSITIONAL_STATUSES.includes(s) ? 3000 : false;
    },
  });

  const stats = useQuery<ContainerStats>({
    queryKey: ["container", orgId, name, "stats"],
    queryFn: () => aegisFetch<ContainerStats>(paths.containerStats(orgId!, name)),
    enabled: !!orgId,
    refetchInterval: 3000,
  });

  const logs = useQuery<Record<string, unknown>>({
    queryKey: ["container", orgId, name, "logs"],
    queryFn: () =>
      aegisFetch<Record<string, unknown>>(`${paths.containerLogs(orgId!, name)}?tail=200`),
    enabled: !!orgId,
  });

  const actionMutation = useMutation({
    mutationFn: (action: NonNullable<Action>) =>
      aegisFetch(
        paths[
          `container${action.charAt(0).toUpperCase() + action.slice(1)}` as "containerStart"
        ](orgId!, name),
        {
          method: "POST",
        },
      ),
    onSuccess: () => {
      setActionError(null);
      void inspect.refetch();
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const execMutation = useMutation({
    mutationFn: (command: string[]) =>
      aegisFetch<ContainerExecResult>(paths.containerExec(orgId!, name), {
        method: "POST",
        body: JSON.stringify({ command }),
      }),
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-2xl font-bold">{name}</h1>
        <div className="flex gap-2">
          {(["start", "stop", "restart"] as const).map((action) => (
            <button
              key={action}
              onClick={() => setPendingAction(action)}
              className="rounded border px-3 py-1 text-sm capitalize hover:bg-muted"
            >
              {tc(action)}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">
          {actionError}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("inspect")}</h2>
        {inspect.isLoading ? (
          <p className="text-sm text-[var(--muted-foreground)]">{tc("loading")}</p>
        ) : inspect.error ? (
          <p className="text-destructive">{(inspect.error as Error).message}</p>
        ) : (
          <OJsonViewer data={inspect.data ?? null} defaultExpandDepth={2} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("stats")}</h2>
        {stats.isLoading ? (
          <p className="text-sm text-[var(--muted-foreground)]">{t("loadingStats")}</p>
        ) : stats.error ? (
          <p className="text-sm text-red-500">{t("errorLoadingStats")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded border bg-[var(--card)] p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">CPU</p>
              <p className="text-xl font-bold text-[var(--primary)]">{stats.data?.cpu_pct}%</p>
            </div>
            <div className="rounded border bg-[var(--card)] p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Memory</p>
              <p className="text-lg font-bold">
                {stats.data?.mem_mb} <span className="text-xs font-normal text-[var(--muted-foreground)]">MB</span>
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]">Limit: {stats.data?.mem_limit_mb} MB</p>
            </div>
            <div className="rounded border bg-[var(--card)] p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Network RX</p>
              <p className="text-lg font-bold text-green-600">{stats.data?.net_rx_kb} KB</p>
            </div>
            <div className="rounded border bg-[var(--card)] p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Network TX</p>
              <p className="text-lg font-bold text-orange-600">{stats.data?.net_tx_kb} KB</p>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("logs")}</h2>
        {logs.isLoading ? (
          <p className="text-sm text-[var(--muted-foreground)]">{tc("loading")}</p>
        ) : logs.error ? (
          <p className="text-destructive">{(logs.error as Error).message}</p>
        ) : (
          <OLogsViewer
            lines={
              logs.data
                ? Array.isArray(logs.data["lines"])
                  ? (logs.data["lines"] as unknown[]).map((l) =>
                      l && typeof l === "object" ? String((l as { message?: unknown }).message) : String(l),
                    )
                  : Object.values(logs.data).map(String)
                : []
            }
            height={400}
            autoScrollToBottom
            searchable
            showLineNumbers
          />
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
        <h2 className="text-lg font-semibold">{t("executeCommand")}</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border border-[var(--border)] bg-[var(--card)] p-2 font-mono text-sm shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            value={execCommand}
            onChange={(e) => setExecCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") execMutation.mutate(execCommand.split(" "));
            }}
            placeholder="ls -la /app"
          />
          <button
            className="rounded bg-[var(--primary)] px-6 py-2 font-semibold text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
            onClick={() => execMutation.mutate(execCommand.split(" "))}
            disabled={execMutation.isPending || !execCommand.trim()}
          >
            {execMutation.isPending ? t("executing") : t("run")}
          </button>
        </div>

        {execMutation.isError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">
            {(execMutation.error as Error).message}
          </div>
        )}

        {execMutation.data && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-4 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
              <div className="flex items-center gap-1">
                {t("statusLabel")}
                {execMutation.data.exit_code === 0 ? (
                  <span className="text-green-600">✅ SUCCESS (0)</span>
                ) : (
                  <span className="text-red-600">❌ FAILED ({execMutation.data.exit_code})</span>
                )}
              </div>
              <div>{t("durationLabel")} {execMutation.data.elapsed_ms}ms</div>
            </div>
            {execMutation.data.stdout && (
              <pre className="max-h-96 overflow-auto rounded bg-gray-900 p-4 font-mono text-xs text-green-400">
                {execMutation.data.stdout}
              </pre>
            )}
            {execMutation.data.stderr && (
              <pre className="max-h-96 overflow-auto rounded border border-red-500/30 bg-red-500/10 p-4 font-mono text-xs text-red-400">
                {execMutation.data.stderr}
              </pre>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Terminal</h2>
          <button
            onClick={() => {
              setAuthToken(getValidToken() ?? "");
              setTerminalOpen((v) => !v);
            }}
            className="rounded border px-3 py-1 text-sm hover:bg-muted"
          >
            {terminalOpen ? t("closeTerminal") : t("openTerminal")}
          </button>
        </div>
        {terminalOpen && (
          <ContainerTerminal
            orgId={orgId!}
            containerName={name}
            token={authToken}
            onClose={() => setTerminalOpen(false)}
          />
        )}
      </section>

      <OConfirmDialog
        open={pendingAction !== null}
        title={t("actionConfirmTitle", { action: pendingAction ? tc(pendingAction) : "" })}
        description={t("actionConfirmDesc", { action: pendingAction ? tc(pendingAction) : "", name })}
        confirmLabel={pendingAction ? tc(pendingAction) : ""}
        onConfirm={() => {
          if (pendingAction) actionMutation.mutate(pendingAction);
          setPendingAction(null);
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
