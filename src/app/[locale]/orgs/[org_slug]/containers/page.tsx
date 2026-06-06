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
    { accessorKey: "name", header: t("name") },
    { accessorKey: "image", header: t("image") },
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
        const ports = row.original.ports;
        if (!ports || (Array.isArray(ports) && ports.length === 0)) return "—";
        if (Array.isArray(ports)) return ports.map((p) => String(p)).join(", ");
        return String(ports);
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); act(row.original.name, "start"); }}
            disabled={actionMutation.isPending}
            className="rounded bg-green-100 px-2 py-0.5 text-xs hover:bg-green-200 disabled:opacity-50"
          >
            {tc("start")}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); act(row.original.name, "stop"); }}
            disabled={actionMutation.isPending}
            className="rounded bg-yellow-100 px-2 py-0.5 text-xs hover:bg-yellow-200 disabled:opacity-50"
          >
            {tc("stop")}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); act(row.original.name, "restart"); }}
            disabled={actionMutation.isPending}
            className="rounded bg-orange-100 px-2 py-0.5 text-xs hover:bg-orange-200 disabled:opacity-50"
          >
            {tc("restart")}
          </button>
          <Link
            href={`/orgs/${org_slug}/containers/${row.original.name}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs hover:bg-gray-200"
          >
            {tc("details")}
          </Link>
        </div>
      ),
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
        <p className="rounded bg-red-50 p-2 text-sm text-red-600">{actionError}</p>
      )}

      <ODataTable<Container>
        data={containers.data ? { columns, rows: containers.data } : null}
        loading={containers.isLoading}
        error={containers.error as Error | null}
        empty={containers.data?.length === 0}
        sortable
      />
    </div>
  );
}
