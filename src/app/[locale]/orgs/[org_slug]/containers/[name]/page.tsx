"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OJsonViewer, OConfirmDialog, OLogsViewer } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type Action = "start" | "stop" | "restart" | null;

export default function ContainerPage() {
  const t = useTranslations("containers");
  const { org_slug, name } = useParams<{ org_slug: string; name: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const [pendingAction, setPendingAction] = useState<Action>(null);

  const inspect = useQuery<Record<string, unknown>>({
    queryKey: ["container", orgId, name, "inspect"],
    queryFn: () => aegisFetch<Record<string, unknown>>(paths.container(orgId!, name)),
    enabled: !!orgId,
  });

  const logs = useQuery<Record<string, unknown>>({
    queryKey: ["container", orgId, name, "logs"],
    queryFn: () => aegisFetch<Record<string, unknown>>(`${paths.containerLogs(orgId!, name)}?tail=200`),
    enabled: !!orgId,
  });

  const actionMutation = useMutation({
    mutationFn: (action: NonNullable<Action>) =>
      aegisFetch(paths[`container${action.charAt(0).toUpperCase() + action.slice(1)}` as "containerStart"](orgId!, name), {
        method: "POST",
      }),
    onSuccess: () => void inspect.refetch(),
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
              {t(action)}
            </button>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Inspect</h2>
        {inspect.isLoading ? <p>Loading…</p> : inspect.error ? (
          <p className="text-destructive">{(inspect.error as Error).message}</p>
        ) : (
          <OJsonViewer data={inspect.data ?? null} defaultExpandDepth={2} />
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("logs")}</h2>
        {logs.isLoading ? <p>Loading…</p> : logs.error ? (
          <p className="text-destructive">{(logs.error as Error).message}</p>
        ) : (
          <OLogsViewer
            lines={
              logs.data
                ? Array.isArray((logs.data as unknown as { lines?: unknown }).lines)
                  ? ((logs.data as unknown as { lines: unknown[] }).lines).map(String)
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
