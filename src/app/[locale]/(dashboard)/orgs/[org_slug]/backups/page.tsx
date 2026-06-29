"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OStatusBadge, OFormField, OTextInput } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import type { Backup, BackupRequest, RestoreRequest } from "@/types/aegis";

type ColDef<T> = ODataTableData<T>["columns"][number];

export default function BackupsPage() {
  const t = useTranslations("backups");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedId] = useState<Backup | null>(null);

  const [createForm, setCreateForm] = useState<BackupRequest>({
    app_slug: "",
    instance_name: "",
    target_volume: "",
  });

  const [restoreForm, setRestoreForm] = useState<RestoreRequest>({
    target_volume: "",
    container_id: "",
  });

  const { data: backups, isLoading, error } = useQuery<Backup[]>({
    queryKey: ["backups", orgId],
    queryFn: () => aegisFetch<Backup[]>(paths.backups(orgId!)),
    enabled: !!orgId,
    refetchInterval: (query) => {
      const rows = query.state.data;
      if (rows?.some((r) => r.status === "pending" || r.status === "restoring")) {
        return 3000;
      }
      return 10000;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: BackupRequest) =>
      aegisFetch(paths.backups(orgId!), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setIsCreateModalOpen(false);
      void qc.invalidateQueries({ queryKey: ["backups", orgId] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (payload: RestoreRequest) =>
      aegisFetch(paths.backupRestore(orgId!, selectedBackup!.id), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setIsRestoreModalOpen(false);
      void qc.invalidateQueries({ queryKey: ["backups", orgId] });
    },
  });

  const columns: ColDef<Backup>[] = [
    { accessorKey: "app_slug", header: tc("app") },
    { accessorKey: "instance_name", header: t("instance") },
    {
      accessorKey: "status",
      header: tc("status"),
      cell: ({ row }) => <OStatusBadge label={row.original.status} />,
    },
    {
      accessorKey: "size_bytes",
      header: t("size"),
      cell: ({ row }) => {
        const bytes = row.original.size_bytes;
        if (!bytes) return "—";
        if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
        return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
      },
    },
    {
      accessorKey: "created_at",
      header: tc("created"),
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      accessorKey: "completed_at",
      header: t("completed"),
      cell: ({ row }) => (row.original.completed_at ? new Date(row.original.completed_at).toLocaleString() : "—"),
    },
    {
      id: "actions",
      header: tc("actions"),
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.original.status === "completed" && (
            <button
              onClick={() => {
                setSelectedId(row.original);
                setRestoreForm({ ...restoreForm, target_volume: row.original.instance_name });
                setIsRestoreModalOpen(true);
              }}
              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
            >
              {t("restore")}
            </button>
          )}
          {row.original.error && (
            <button
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)]"
              onClick={() => alert(row.original.error)}
            >
              {tc("details")}
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
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {t("newBackup")}
        </button>
      </div>

      <ODataTable<Backup>
        data={backups ? { columns, rows: backups } : null}
        loading={isLoading}
        error={error as Error | null}
        empty={backups?.length === 0}
        sortable
      />

      {/* Create Backup Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl text-gray-900">
            <h2 className="mb-4 text-xl font-bold">{t("newBackup")}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(createForm);
              }}
              className="space-y-4"
            >
              <OFormField label="App Slug">
                <OTextInput
                  value={createForm.app_slug}
                  onChange={(e) => setCreateForm({ ...createForm, app_slug: e.target.value })}
                  placeholder="e.g. gitea"
                  required
                />
              </OFormField>
              <OFormField label="Instance Name">
                <OTextInput
                  value={createForm.instance_name}
                  onChange={(e) => setCreateForm({ ...createForm, instance_name: e.target.value })}
                  placeholder="e.g. gitea-prod"
                  required
                />
              </OFormField>
              <OFormField label="Target Volume">
                <OTextInput
                  value={createForm.target_volume}
                  onChange={(e) => setCreateForm({ ...createForm, target_volume: e.target.value })}
                  placeholder="e.g. gitea_data"
                  required
                />
              </OFormField>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-md px-4 py-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)]"
                >
                  {tc("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? "..." : tc("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {isRestoreModalOpen && selectedBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl text-gray-900">
            <h2 className="mb-2 text-xl font-bold">{t("restore")}</h2>
            <p className="mb-4 text-sm text-gray-500">
              Restoring from <span className="font-mono font-bold">{selectedBackup.backup_key}</span>
            </p>
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 font-medium">
              ⚠️ Warning: This will overwrite existing data in the target volume.
              Ensure related containers are stopped.
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                restoreMutation.mutate(restoreForm);
              }}
              className="space-y-4"
            >
              <OFormField label="Target Volume">
                <OTextInput
                  value={restoreForm.target_volume}
                  onChange={(e) => setRestoreForm({ ...restoreForm, target_volume: e.target.value })}
                  required
                />
              </OFormField>
              <OFormField label="Container ID (to stop before restore)">
                <OTextInput
                  value={restoreForm.container_id}
                  onChange={(e) => setRestoreForm({ ...restoreForm, container_id: e.target.value })}
                  placeholder="Optional"
                />
              </OFormField>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRestoreModalOpen(false)}
                  className="rounded-md px-4 py-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)]"
                >
                  {tc("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={restoreMutation.isPending}
                  className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {restoreMutation.isPending ? "..." : t("confirmRestore")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
