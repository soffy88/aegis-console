"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OStatusBadge } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type DockerNetwork = {
  id: string;
  name: string;
  driver: string | null;
  scope: string | null;
  internal: boolean | null;
};

type ColDef<T> = ODataTableData<T>["columns"][number];

export default function NetworksPage() {
  const t = useTranslations("networks");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const networks = useQuery<DockerNetwork[]>({
    queryKey: ["networks", orgId],
    queryFn: () => aegisFetch<DockerNetwork[]>(paths.dockerNetworks(orgId!)),
    enabled: !!orgId,
    refetchInterval: 10000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      aegisFetch(paths.dockerNetwork(orgId!, encodeURIComponent(id)), { method: "DELETE" }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ["networks", orgId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const columns: ColDef<DockerNetwork>[] = [
    { accessorKey: "name", header: t("name"), cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "driver", header: t("driver"), cell: ({ row }) => row.original.driver || "—" },
    { accessorKey: "scope", header: t("scope"), cell: ({ row }) => row.original.scope || "—" },
    {
      accessorKey: "internal",
      header: t("internal"),
      cell: ({ row }) => <OStatusBadge label={row.original.internal ? tc("yes") : tc("no")} />,
    },
    {
      accessorKey: "actions",
      header: "",
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteMutation.mutate(row.original.id);
          }}
          disabled={deleteMutation.isPending}
          className="rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          {tc("delete")}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">{error}</p>
      )}
      <div className="overflow-x-auto">
        <ODataTable<DockerNetwork>
          data={networks.data ? { columns, rows: networks.data } : null}
          loading={networks.isLoading}
          error={networks.error as Error | null}
          empty={networks.data?.length === 0}
          sortable
        />
      </div>
    </div>
  );
}
