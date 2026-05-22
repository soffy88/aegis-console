"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { OJsonViewer, OConfirmDialog } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";

type Action = "start" | "stop" | "restart" | null;

export default function ContainerPage({
  params,
}: {
  params: { name: string };
}) {
  const { name } = params;
  const [pendingAction, setPendingAction] = useState<Action>(null);

  const inspect = useQuery<Record<string, unknown>>({
    queryKey: ["container", name, "inspect"],
    queryFn: () =>
      aegisFetch<Record<string, unknown>>(
        `/api/v1/docker/containers/${name}`,
      ),
  });

  const logs = useQuery<Record<string, unknown>>({
    queryKey: ["container", name, "logs"],
    queryFn: () =>
      aegisFetch<Record<string, unknown>>(
        `/api/v1/docker/containers/${name}/logs?tail=200`,
      ),
  });

  const actionMutation = useMutation({
    mutationFn: (action: NonNullable<Action>) =>
      aegisFetch(`/api/v1/docker/containers/${name}/${action}`, {
        method: "POST",
      }),
    onSuccess: () => {
      void inspect.refetch();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-2xl font-bold">{name}</h1>
        <div className="flex gap-2">
          {(["start", "stop", "restart"] as const).map((action) => (
            <button
              key={action}
              onClick={() => setPendingAction(action)}
              className="rounded border px-3 py-1 text-sm capitalize hover:bg-muted"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Inspect</h2>
        {inspect.isLoading ? (
          <p>Loading…</p>
        ) : inspect.error ? (
          <p className="text-destructive">
            {(inspect.error as Error).message}
          </p>
        ) : (
          <OJsonViewer data={inspect.data ?? null} defaultExpandDepth={2} />
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Logs</h2>
        {logs.isLoading ? (
          <p>Loading…</p>
        ) : logs.error ? (
          <p className="text-destructive">{(logs.error as Error).message}</p>
        ) : (
          <OJsonViewer data={logs.data ?? null} defaultExpandDepth={1} />
        )}
      </section>

      <OConfirmDialog
        open={pendingAction !== null}
        title={`${pendingAction ? pendingAction.charAt(0).toUpperCase() + pendingAction.slice(1) : ""} Container`}
        description={`${pendingAction} container "${name}"?`}
        confirmLabel={pendingAction ?? "Confirm"}
        onConfirm={() => {
          if (pendingAction) actionMutation.mutate(pendingAction);
          setPendingAction(null);
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
