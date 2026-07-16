"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OStatusBadge, OConfirmDialog } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import type { Container } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type ColDef<T> = ODataTableData<T>["columns"][number];
type Action = "start" | "stop" | "restart";

/** Docker Compose stamps this label on every container it manages; it is the
 *  grouping key used by Docker Desktop / Portainer to render "stacks". */
const PROJECT_LABEL = "com.docker.compose.project";
const projectOf = (c: Container) => c.labels?.[PROJECT_LABEL] ?? "";
const stateOf = (c: Container) => c.state ?? c.status;
const isRunning = (c: Container) => stateOf(c) === "running";

/** Format one Docker port. Real payload is an array of
 *  {host_port, container_port, protocol} objects (the Container type's
 *  Record<string,string> is inaccurate), so never String() an object. */
function fmtPort(p: unknown): string {
  if (p && typeof p === "object") {
    const o = p as Record<string, unknown>;
    const hp = o.host_port ?? o.hostPort;
    const cp = o.container_port ?? o.containerPort ?? o.port;
    const proto = o.protocol ? `/${o.protocol}` : "";
    if (hp && cp) return `${hp}→${cp}${proto}`;
    if (cp) return `${cp}${proto}`;
    return Object.values(o).filter(Boolean).join(":");
  }
  return String(p);
}

function fmtStarted(c: Container): string {
  const s = c.started_at ?? c.created;
  if (!s) return "—";
  const d = new Date(s);
  // oprim reports "0001-01-01T..." for never-started; guard against it.
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return "—";
  return d.toLocaleString();
}

function actionUrl(orgId: string, name: string, action: Action): string {
  return action === "start"
    ? paths.containerStart(orgId, name)
    : action === "stop"
      ? paths.containerStop(orgId, name)
      : paths.containerRestart(orgId, name);
}

const ICON = {
  play: "M7 5v14l11-7z",
  stop: "M7 7h10v10H7z",
  restart: "M21 12a9 9 0 11-3-6.7M21 4v5h-5",
  info: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8h.01M11 12h1v5h1",
  chevron: "M9 6l6 6-6 6",
};
function ActIcon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} animate-spin`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

export default function ContainersPage() {
  const t = useTranslations("containers");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Pending bulk stop/restart awaiting confirmation (destructive on a whole stack).
  const [bulkConfirm, setBulkConfirm] = useState<{ label: string; names: string[]; action: Action } | null>(null);
  // Pending single-container stop/restart awaiting confirmation.
  const [rowConfirm, setRowConfirm] = useState<{ name: string; action: Action } | null>(null);

  const invalidate = () => {
    setActionError(null);
    void qc.invalidateQueries({ queryKey: ["containers", orgId] });
  };

  const actionMutation = useMutation({
    mutationFn: ({ name, action }: { name: string; action: Action }) =>
      aegisFetch(actionUrl(orgId!, name, action), { method: "POST" }),
    onSuccess: invalidate,
    onError: (err: Error) => setActionError(err.message),
  });

  // Stack-level bulk action: fire one request per relevant container, tolerate
  // partial failure (a no-op on an already-stopped container shouldn't abort).
  const bulkMutation = useMutation({
    mutationFn: async ({ names, action }: { names: string[]; action: Action }) => {
      const results = await Promise.allSettled(
        names.map((name) => aegisFetch(actionUrl(orgId!, name, action), { method: "POST" })),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length)
        throw new Error(`${failed.length}/${names.length} failed: ${(failed[0] as PromiseRejectedResult).reason?.message ?? ""}`);
    },
    onSuccess: invalidate,
    onError: (err: Error) => setActionError(err.message),
  });

  function act(name: string, action: Action) {
    // start is non-destructive → fire immediately; stop/restart needs confirmation.
    if (action === "start") actionMutation.mutate({ name, action });
    else setRowConfirm({ name, action });
  }
  function bulkAct(items: Container[], action: Action, label: string) {
    const targets =
      action === "start" ? items.filter((c) => !isRunning(c)) : items.filter(isRunning);
    if (targets.length === 0) return;
    const names = targets.map((c) => c.name);
    // start-all is non-destructive → fire immediately; stop/restart-all needs
    // confirmation since it can take down a whole stack at once.
    if (action === "start") {
      bulkMutation.mutate({ names, action });
      return;
    }
    setBulkConfirm({ label, names, action });
  }

  const busy = actionMutation.isPending || bulkMutation.isPending;
  // Which single container action is in flight — gray only that row's buttons.
  const acting = actionMutation.isPending ? actionMutation.variables : null;

  const columns: ColDef<Container>[] = [
    {
      accessorKey: "name",
      header: t("name"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "image",
      header: t("image"),
      cell: ({ row }) => (
        <span className="block max-w-[260px] truncate text-[var(--muted-foreground)]" title={row.original.image}>
          {row.original.image}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ row }) => <OStatusBadge label={row.original.status} />,
    },
    {
      accessorKey: "started_at",
      header: t("started"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-[var(--muted-foreground)]">{fmtStarted(row.original)}</span>
      ),
    },
    {
      accessorKey: "ports",
      header: t("ports"),
      cell: ({ row }) => {
        const ports = row.original.ports as unknown;
        if (!ports) return "—";
        const entries = Array.isArray(ports)
          ? ports.map(fmtPort)
          : typeof ports === "object"
            ? Object.entries(ports as Record<string, unknown>).map(([k, v]) =>
                v ? `${fmtPort(v)} → ${k}` : k,
              )
            : [String(ports)];
        if (entries.length === 0) return "—";
        return (
          <span className="font-mono text-xs text-[var(--muted-foreground)]">
            {entries.join(", ")}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const n = row.original.name;
        const ib =
          "grid h-7 w-7 place-items-center rounded-md border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)] disabled:opacity-40";
        const rowBusy = acting?.name === n;
        return (
          <div className="flex items-center justify-end gap-1">
            <button title={tc("start")} aria-label={tc("start")} onClick={(e) => { e.stopPropagation(); act(n, "start"); }} disabled={rowBusy} className={ib}>
              {rowBusy && acting?.action === "start" ? <Spinner /> : <ActIcon d={ICON.play} />}
            </button>
            <button title={tc("stop")} aria-label={tc("stop")} onClick={(e) => { e.stopPropagation(); act(n, "stop"); }} disabled={rowBusy} className={ib}>
              {rowBusy && acting?.action === "stop" ? <Spinner /> : <ActIcon d={ICON.stop} />}
            </button>
            <button title={tc("restart")} aria-label={tc("restart")} onClick={(e) => { e.stopPropagation(); act(n, "restart"); }} disabled={rowBusy} className={ib}>
              {rowBusy && acting?.action === "restart" ? <Spinner /> : <ActIcon d={ICON.restart} />}
            </button>
            <Link title={tc("details")} aria-label={tc("details")} href={`/orgs/${org_slug}/containers/${n}`} onClick={(e) => e.stopPropagation()} className={`${ib} hover:border-[var(--primary)] hover:text-[var(--primary)]`}>
              <ActIcon d={ICON.info} />
            </Link>
          </div>
        );
      },
    },
  ];

  const containers = useQuery<Container[]>({
    queryKey: ["containers", orgId, showAll],
    queryFn: () =>
      aegisFetch<Container[]>(`${paths.containers(orgId!)}${showAll ? "?all=true" : ""}`),
    enabled: !!orgId,
    refetchInterval: 5000,
  });

  // Always-all query for the summary tiles (independent of the "show stopped" toggle).
  const allContainers = useQuery<Container[]>({
    queryKey: ["containers", orgId, "all-stats"],
    queryFn: () => aegisFetch<Container[]>(`${paths.containers(orgId!)}?all=true`),
    enabled: !!orgId,
    refetchInterval: 5000,
  });
  const cTotal = allContainers.data?.length ?? 0;
  const cRunning = allContainers.data?.filter(isRunning).length ?? 0;
  const cStopped = cTotal - cRunning;

  // Group by compose project; real projects sorted alphabetically, standalone last.
  const groups = useMemo(() => {
    const map = new Map<string, Container[]>();
    for (const c of containers.data ?? []) {
      const k = projectOf(c);
      const arr = map.get(k);
      if (arr) arr.push(c);
      else map.set(k, [c]);
    }
    return [...map.entries()]
      .map(([key, items]) => ({
        key,
        label: key || t("ungrouped"),
        items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
        running: items.filter(isRunning).length,
      }))
      .sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : a.key.localeCompare(b.key)));
  }, [containers.data, t]);

  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.key));
  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleAll() {
    setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.key)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-4 text-sm">
          {groups.length > 0 && (
            <button onClick={toggleAll} className="text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]">
              {allCollapsed ? t("expandAll") : t("collapseAll")}
            </button>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            {t("showStopped")}
          </label>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("total")}</p>
          <p className="mt-1 text-2xl font-bold">{cTotal}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("runningCount")}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{cRunning}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("stoppedCount")}</p>
          <p className={`mt-1 text-2xl font-bold ${cStopped > 0 ? "text-amber-400" : ""}`}>{cStopped}</p>
        </div>
      </div>

      {actionError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">{actionError}</p>
      )}

      {containers.isLoading || containers.error ? (
        <ODataTable<Container>
          data={null}
          loading={containers.isLoading}
          error={containers.error as Error | null}
        />
      ) : groups.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-[var(--muted-foreground)]">{t("empty")}</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const open = !collapsed.has(g.key);
            const dot =
              g.running === g.items.length ? "bg-emerald-400" : g.running > 0 ? "bg-amber-400" : "bg-[var(--muted-foreground)]";
            const gib =
              "grid h-7 w-7 place-items-center rounded-md border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)] disabled:opacity-40";
            return (
              <div key={g.key} className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleGroup(g.key)}
                    aria-expanded={open}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <ActIcon d={ICON.chevron} className={`h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform ${open ? "rotate-90" : ""}`} />
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <span className="font-semibold">{g.label}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {t("projectContainers", { running: g.running, total: g.items.length })}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button title={t("startAll")} aria-label={t("startAll")} onClick={() => bulkAct(g.items, "start", g.label)} disabled={busy} className={gib}>
                      <ActIcon d={ICON.play} />
                    </button>
                    <button title={t("stopAll")} aria-label={t("stopAll")} onClick={() => bulkAct(g.items, "stop", g.label)} disabled={busy} className={gib}>
                      <ActIcon d={ICON.stop} />
                    </button>
                    <button title={t("restartAll")} aria-label={t("restartAll")} onClick={() => bulkAct(g.items, "restart", g.label)} disabled={busy} className={gib}>
                      <ActIcon d={ICON.restart} />
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="overflow-x-auto border-t border-[var(--border)]">
                    <ODataTable<Container> data={{ columns, rows: g.items }} sortable />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <OConfirmDialog
        open={bulkConfirm !== null}
        title={bulkConfirm?.action === "stop" ? t("bulkStopTitle") : t("bulkRestartTitle")}
        description={
          bulkConfirm
            ? t(bulkConfirm.action === "stop" ? "bulkStopConfirm" : "bulkRestartConfirm", {
                count: bulkConfirm.names.length,
                group: bulkConfirm.label,
              })
            : ""
        }
        danger
        confirmLabel={bulkConfirm?.action === "stop" ? t("stopAll") : t("restartAll")}
        onConfirm={() => {
          if (bulkConfirm) {
            bulkMutation.mutate({ names: bulkConfirm.names, action: bulkConfirm.action });
            setBulkConfirm(null);
          }
        }}
        onCancel={() => setBulkConfirm(null)}
      />

      <OConfirmDialog
        open={rowConfirm !== null}
        title={rowConfirm?.action === "stop" ? t("singleStopTitle") : t("singleRestartTitle")}
        description={
          rowConfirm
            ? t(rowConfirm.action === "stop" ? "singleStopConfirm" : "singleRestartConfirm", {
                name: rowConfirm.name,
              })
            : ""
        }
        danger
        confirmLabel={rowConfirm ? tc(rowConfirm.action) : ""}
        onConfirm={() => {
          if (rowConfirm) {
            actionMutation.mutate(rowConfirm);
            setRowConfirm(null);
          }
        }}
        onCancel={() => setRowConfirm(null)}
      />
    </div>
  );
}
