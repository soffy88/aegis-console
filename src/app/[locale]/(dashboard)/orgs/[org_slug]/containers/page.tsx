"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OStatusBadge } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import type { Container } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type ColDef<T> = ODataTableData<T>["columns"][number];

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

const ICON = {
  play: "M7 5v14l11-7z",
  stop: "M7 7h10v10H7z",
  restart: "M21 12a9 9 0 11-3-6.7M21 4v5h-5",
  info: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8h.01M11 12h1v5h1",
};
function ActIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
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

  const actionMutation = useMutation({
    mutationFn: ({ name, action }: { name: string; action: "start" | "stop" | "restart" }) => {
      const url =
        action === "start"
          ? paths.containerStart(orgId!, name)
          : action === "stop"
            ? paths.containerStop(orgId!, name)
            : paths.containerRestart(orgId!, name);
      return aegisFetch(url, { method: "POST" });
    },
    onSuccess: () => {
      setActionError(null);
      void qc.invalidateQueries({ queryKey: ["containers", orgId] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  function act(name: string, action: "start" | "stop" | "restart") {
    actionMutation.mutate({ name, action });
  }

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
    { accessorKey: "created", header: t("started") },
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
        return (
          <div className="flex items-center justify-end gap-1">
            <button title={tc("start")} aria-label={tc("start")} onClick={(e) => { e.stopPropagation(); act(n, "start"); }} disabled={actionMutation.isPending} className={ib}>
              <ActIcon d={ICON.play} />
            </button>
            <button title={tc("stop")} aria-label={tc("stop")} onClick={(e) => { e.stopPropagation(); act(n, "stop"); }} disabled={actionMutation.isPending} className={ib}>
              <ActIcon d={ICON.stop} />
            </button>
            <button title={tc("restart")} aria-label={tc("restart")} onClick={(e) => { e.stopPropagation(); act(n, "restart"); }} disabled={actionMutation.isPending} className={ib}>
              <ActIcon d={ICON.restart} />
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          {t("showStopped")}
        </label>
      </div>

      {actionError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">{actionError}</p>
      )}

      <div className="overflow-x-auto">
        <ODataTable<Container>
          data={containers.data ? { columns, rows: containers.data } : null}
          loading={containers.isLoading}
          error={containers.error as Error | null}
          empty={containers.data?.length === 0}
          sortable
        />
      </div>
    </div>
  );
}
