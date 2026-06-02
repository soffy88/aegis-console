"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  OHighDensityTable,
  OStatusBadge,
  OEmptyState,
  OLoadingState,
  OErrorState,
  OFormField,
  OConfirmDialog,
} from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import { usePermission } from "@/lib/auth/use-permission";
import type { WebhookSubscription, WebhookSubscriptionCreate } from "@/types/aegis";

type SubRow = WebhookSubscription & Record<string, unknown>;

const VALID_EVENT_TYPES = [
  "alert.fired",
  "autoheal.completed",
  "autoheal.failed",
  "autoheal.cancelled",
  "release.approved",
  "release.rejected",
  "release.expired",
  "error.new_issue",
  "error.spike",
];

const defaultCreate: WebhookSubscriptionCreate = {
  name: "",
  url: "",
  event_types: [],
  retry_count: 3,
  enabled: true,
};


export default function WebhooksListPage() {
  const { org_slug } = useParams<{ org_slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orgId = useOrgIdBySlug(org_slug);
  const { canWrite } = usePermission();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<WebhookSubscriptionCreate>(defaultCreate);
  const [deleteTarget, setDeleteTarget] = useState<WebhookSubscription | null>(null);
  const [mutateError, setMutateError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["webhooks", orgId],
    queryFn: (): Promise<WebhookSubscription[]> => {
      if (!orgId) return Promise.resolve([]);
      return aegisFetch<WebhookSubscription[]>(paths.webhooksList(orgId));
    },
    enabled: !!orgId,
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (body: WebhookSubscriptionCreate) => {
      if (!orgId) throw new Error("missing context");
      return aegisFetch<WebhookSubscription>(paths.webhookCreate(orgId), {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks", orgId] });
      setShowCreate(false);
      setForm(defaultCreate);
      setMutateError(null);
    },
    onError: (e: Error) => setMutateError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (subId: string) => {
      if (!orgId) throw new Error("missing context");
      return aegisFetch<void>(paths.webhookDelete(orgId, subId), {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks", orgId] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => setMutateError(e.message),
  });

  const toggleEventType = (et: string) => {
    setForm((f) => ({
      ...f,
      event_types: f.event_types.includes(et)
        ? f.event_types.filter((x) => x !== et)
        : [...f.event_types, et],
    }));
  };

  if (isLoading) return <OLoadingState message="Loading webhooks…" />;
  if (error)
    return (
      <OErrorState
        error={error instanceof Error ? error.message : "Failed to load webhooks"}
      />
    );

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhook Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Outbound notifications for org-level events
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            Create webhook
          </button>
        )}
      </header>

      {showCreate && (
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-lg font-semibold">New webhook</h2>
          <div className="grid grid-cols-2 gap-3">
            <OFormField label="Name">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="my-webhook"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label="URL">
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://example.com/webhook"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label="Secret (optional)">
              <input
                type="text"
                value={form.secret_encrypted ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    secret_encrypted: e.target.value || undefined,
                  }))
                }
                placeholder="env:VAR_NAME or plain:secret"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label="Retry count">
              <input
                type="number"
                value={form.retry_count ?? 3}
                min={0}
                max={10}
                onChange={(e) =>
                  setForm((f) => ({ ...f, retry_count: Number(e.target.value) }))
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
          </div>
          <OFormField label="Event types">
            <div className="grid grid-cols-2 gap-1 mt-1">
              {VALID_EVENT_TYPES.map((et) => (
                <label key={et} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.event_types.includes(et)}
                    onChange={() => toggleEventType(et)}
                  />
                  {et}
                </label>
              ))}
            </div>
          </OFormField>
          {mutateError && (
            <div className="text-sm text-destructive">{mutateError}</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={
                !form.name.trim() ||
                !form.url.trim() ||
                form.event_types.length === 0 ||
                createMutation.isPending
              }
              className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setForm(defaultCreate);
              }}
              className="rounded border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {!data?.length ? (
        <OEmptyState
          title="No webhook subscriptions"
          description="Create a webhook to receive notifications for org events"
        />
      ) : (
        <OHighDensityTable<SubRow>
          columns={[
            { key: "name", header: "Name" },
            {
              key: "url",
              header: "URL",
              format: (_v, r) => (
                <span className="font-mono text-xs truncate max-w-xs block">
                  {String(r.url)}
                </span>
              ),
            },
            {
              key: "event_types",
              header: "Events",
              format: (_v, r) => (
                <span className="text-xs text-muted-foreground">
                  {(r.event_types as string[]).join(", ")}
                </span>
              ),
            },
            {
              key: "enabled",
              header: "Status",
              format: (_v, r) => (
                <OStatusBadge
                  status={r.enabled ? "active" : "inactive"}
                  label={r.enabled ? "enabled" : "disabled"}
                />
              ),
            },
            { key: "retry_count", header: "Retries" },
            {
              key: "actions",
              header: "",
              format: (_v, r) =>
                canWrite ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(r as WebhookSubscription);
                    }}
                    className="text-destructive text-xs hover:underline"
                  >
                    Delete
                  </button>
                ) : null,
            },
          ]}
          rows={data as SubRow[]}
          rowKey="sub_id"
          onRowClick={(r) => router.push(`/orgs/${org_slug}/webhooks/${r.sub_id}`)}
        />
      )}

      {deleteTarget && (
        <OConfirmDialog
          open
          title="Delete webhook subscription?"
          description={`This will permanently delete "${deleteTarget.name}" and all its delivery history.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => deleteMutation.mutate(deleteTarget.sub_id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
