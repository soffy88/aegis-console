"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OConfirmDialog, OStatusBadge } from "@helios/blocks";
import type { App } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";

export default function AppDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const qc = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const { data, isLoading, error } = useQuery<App>({
    queryKey: ["app", id],
    queryFn: () => aegisFetch<App>(`/api/v1/apps/${id}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      aegisFetch(`/api/v1/apps/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["apps"] });
      router.push("/apps");
    },
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{data.app_name}</h1>
        <OStatusBadge label={data.status} />
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="font-medium opacity-60">Version</dt>
          <dd>{data.app_version ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium opacity-60">Install Directory</dt>
          <dd className="font-mono">{data.install_dir ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium opacity-60">Domain</dt>
          <dd>{data.domain ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium opacity-60">Installed At</dt>
          <dd>{new Date(data.installed_at).toLocaleString()}</dd>
        </div>
      </dl>

      <button
        onClick={() => setShowDelete(true)}
        className="rounded border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground"
      >
        Uninstall
      </button>

      <OConfirmDialog
        open={showDelete}
        title="Uninstall App"
        description={`Remove "${data.app_name}" from the system. This cannot be undone.`}
        danger
        confirmLabel="Uninstall"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
