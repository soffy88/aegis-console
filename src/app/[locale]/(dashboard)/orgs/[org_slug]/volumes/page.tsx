"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OConfirmDialog } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type DockerVolume = {
  name: string;
  driver: string | null;
  mountpoint: string | null;
  created_at: string | null;
};

type ColDef<T> = ODataTableData<T>["columns"][number];

export default function VolumesPage() {
  const t = useTranslations("volumes");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const volumes = useQuery<DockerVolume[]>({
    queryKey: ["volumes", orgId],
    queryFn: () => aegisFetch<DockerVolume[]>(paths.dockerVolumes(orgId!)),
    enabled: !!orgId,
    refetchInterval: 10000,
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) =>
      aegisFetch(paths.dockerVolume(orgId!, encodeURIComponent(name)), {
        method: "DELETE",
      }),
    onSuccess: () => {
      setError(null);
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: ["volumes", orgId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const columns: ColDef<DockerVolume>[] = [
    { accessorKey: "name", header: t("name"), cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "driver", header: t("driver"), cell: ({ row }) => row.original.driver || "—" },
    {
      accessorKey: "mountpoint",
      header: t("mountpoint"),
      cell: ({ row }) => (
        <span className="block max-w-[360px] truncate font-mono text-xs text-[var(--muted-foreground)]" title={row.original.mountpoint ?? ""}>
          {row.original.mountpoint || "—"}
        </span>
      ),
    },
    {
      accessorKey: "actions",
      header: "",
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(row.original.name);
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
        <ODataTable<DockerVolume>
          data={volumes.data ? { columns, rows: volumes.data } : null}
          loading={volumes.isLoading}
          error={volumes.error as Error | null}
          empty={volumes.data?.length === 0}
          sortable
        />
      </div>

      <OConfirmDialog
        open={deleteTarget !== null}
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget ?? "" })}
        danger
        confirmLabel={tc("delete")}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
