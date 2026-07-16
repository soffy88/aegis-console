"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  OHighDensityTable,
  OStatusBadge,
  OFormField,
  OLoadingState,
  OErrorState,
  OConfirmDialog,
  OJsonViewer,
} from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import { useWebhookEventTypes } from "@/hooks/useWebhookEventTypes";
import { usePermission } from "@/lib/auth/use-permission";
import type {
  WebhookSubscription,
  WebhookSubscriptionCreate,
  WebhookDelivery,
} from "@/types/aegis";

type DeliveryRow = WebhookDelivery & Record<string, unknown>;

type DeliveryState =
  | "pending"
  | "in_flight"
  | "succeeded"
  | "failed"
  | "dead_letter";

const DELIVERY_BADGE: Record<
  DeliveryState,
  "active" | "warning" | "error" | "inactive"
> = {
  succeeded: "active",
  pending: "warning",
  in_flight: "warning",
  failed: "error",
  dead_letter: "error",
};

export default function WebhookDetailPage() {
  const { org_slug, sub_id } = useParams<{
    org_slug: string;
    sub_id: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orgId = useOrgIdBySlug(org_slug);
  const { canWrite } = usePermission();
  const t = useTranslations("webhooks");
  const tc = useTranslations("common");
  const { data: eventTypesData, isLoading: eventTypesLoading } =
    useWebhookEventTypes(orgId);

  const [editForm, setEditForm] = useState<Partial<WebhookSubscriptionCreate>>({});
  const [showDelete, setShowDelete] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);

  const {
    data: sub,
    isLoading,
    error: subError,
  } = useQuery({
    queryKey: ["webhook", orgId, sub_id],
    queryFn: (): Promise<WebhookSubscription> => {
      if (!orgId) throw new Error("missing context");
      return aegisFetch<WebhookSubscription>(paths.webhookGet(orgId, sub_id));
    },
    enabled: !!orgId,
    refetchInterval: 30_000,
  });

  const { data: deliveries } = useQuery({
    queryKey: ["webhook-deliveries", orgId, sub_id],
    queryFn: (): Promise<WebhookDelivery[]> => {
      if (!orgId) return Promise.resolve([]);
      return aegisFetch<WebhookDelivery[]>(paths.webhookDeliveries(orgId, sub_id));
    },
    enabled: !!orgId,
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (body: Partial<WebhookSubscriptionCreate>) => {
      if (!orgId) throw new Error("missing context");
      return aegisFetch<WebhookSubscription>(paths.webhookUpdate(orgId, sub_id), {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook", orgId, sub_id] });
      queryClient.invalidateQueries({ queryKey: ["webhooks", orgId] });
      setEditForm({});
      setSaveError(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!orgId) throw new Error("missing context");
      return aegisFetch<void>(paths.webhookDelete(orgId, sub_id), {
        method: "DELETE",
      });
    },
    onSuccess: () => router.push(`/orgs/${org_slug}/webhooks`),
    onError: (e: Error) => setSaveError(e.message),
  });

  const testMutation = useMutation({
    mutationFn: () => {
      if (!orgId) throw new Error("missing context");
      return aegisFetch<{ status: string }>(paths.webhookTest(orgId, sub_id), {
        method: "POST",
      });
    },
    onSuccess: () => {
      setTestResult(`${t("testEnqueued")} ✓`);
      setTimeout(() => setTestResult(null), 3000);
    },
    onError: (e: Error) => setTestResult(`${t("testFailed")}: ${e.message}`),
  });

  const toggleEventType = (et: string) => {
    const current = editForm.event_types ?? sub?.event_types ?? [];
    setEditForm((f) => ({
      ...f,
      event_types: current.includes(et)
        ? current.filter((x) => x !== et)
        : [...current, et],
    }));
  };

  if (isLoading) return <OLoadingState message={t("loadingDetail")} />;
  if (subError || !sub)
    return (
      <OErrorState
        error={subError instanceof Error ? subError.message : t("notFound")}
      />
    );

  const currentEventTypes = editForm.event_types ?? sub.event_types;

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="space-y-2">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {t("back")}
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{sub.name}</h1>
            <OStatusBadge
              status={sub.enabled ? "active" : "inactive"}
              label={sub.enabled ? tc("enabled") : tc("disabled")}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="rounded border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              {testMutation.isPending ? t("sending") : t("testSend")}
            </button>
            {canWrite && (
              <button
                onClick={() => setShowDelete(true)}
                className="rounded border border-destructive px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                {tc("delete")}
              </button>
            )}
          </div>
        </div>
        {testResult && (
          <div className="text-sm text-green-600">{testResult}</div>
        )}
      </header>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: config */}
        <section className="space-y-2 text-sm">
          <h2 className="font-semibold text-base">{t("configuration")}</h2>
          <div>
            <span className="text-muted-foreground">{t("url")}: </span>
            <span className="font-mono break-all">{sub.url}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t("cfgSecret")}: </span>
            <span className="font-mono">
              {sub.has_secret ? "••••••••" : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">{t("eventTypes")}: </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {sub.event_types.map((et) => (
                <span
                  key={et}
                  className="rounded bg-muted px-2 py-0.5 text-xs font-mono"
                >
                  {et}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">{t("retryCount")}: </span>
            <span>{sub.retry_count}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t("cfgBackoff")}: </span>
            <span className="font-mono">
              [{sub.retry_backoff_seconds.join(", ")}]
            </span>
          </div>
        </section>

        {/* Right: edit form */}
        {canWrite && (
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="font-semibold text-base">{tc("edit")}</h2>
            <OFormField label={tc("name")}>
              <input
                type="text"
                defaultValue={sub.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label={t("url")}>
              <input
                type="url"
                defaultValue={sub.url}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, url: e.target.value }))
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label={t("secretEditHint")}>
              <input
                type="text"
                placeholder="env:VAR_NAME or plain:secret"
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    secret_encrypted: e.target.value || undefined,
                  }))
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label={t("eventTypes")}>
              <div className="grid grid-cols-1 gap-1 mt-1">
                {eventTypesLoading ? (
                  <span className="text-xs text-muted-foreground">
                    {t("loadingEventTypes")}
                  </span>
                ) : (
                  (eventTypesData?.event_types ?? []).map((et) => (
                    <label
                      key={et.event_type}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={currentEventTypes.includes(et.event_type)}
                        onChange={() => toggleEventType(et.event_type)}
                      />
                      {et.event_type}
                    </label>
                  ))
                )}
              </div>
            </OFormField>
            <OFormField label={t("enabled")}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={sub.enabled}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, enabled: e.target.checked }))
                  }
                />
                {t("enabled")}
              </label>
            </OFormField>
            {saveError && (
              <div className="text-sm text-destructive">{saveError}</div>
            )}
            {saveSuccess && (
              <div className="text-sm text-green-600">{t("saved")} ✓</div>
            )}
            <button
              onClick={() =>
                Object.keys(editForm).length > 0 &&
                updateMutation.mutate(editForm)
              }
              disabled={
                Object.keys(editForm).length === 0 || updateMutation.isPending
              }
              className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {updateMutation.isPending ? tc("loading") : tc("save")}
            </button>
          </section>
        )}
      </div>

      {/* Deliveries */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("deliveries")}</h2>
        {!deliveries?.length ? (
          <p className="text-sm text-muted-foreground">{t("noDeliveries")}</p>
        ) : (
          <OHighDensityTable<DeliveryRow>
            columns={[
              {
                key: "state",
                header: t("colState"),
                format: (_v, r) => (
                  <OStatusBadge
                    status={DELIVERY_BADGE[r.state as DeliveryState] ?? "inactive"}
                    label={String(r.state)}
                  />
                ),
              },
              { key: "event_type", header: t("colEvent") },
              {
                key: "last_status_code",
                header: t("colHttp"),
                format: (_v, r) =>
                  r.last_status_code != null ? String(r.last_status_code) : "—",
              },
              {
                key: "attempt_no",
                header: t("colAttempts"),
                format: (_v, r) => `${r.attempt_no}/${r.max_attempts}`,
              },
              {
                key: "last_error",
                header: t("colError"),
                format: (_v, r) =>
                  r.last_error ? (
                    <span className="text-xs text-destructive truncate max-w-xs block">
                      {String(r.last_error)}
                    </span>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "created_at",
                header: tc("created"),
                format: (_v, r) =>
                  new Date(String(r.created_at)).toLocaleString(),
              },
            ]}
            rows={deliveries as DeliveryRow[]}
            rowKey="delivery_id"
            onRowClick={(r) =>
              setExpandedDelivery(
                expandedDelivery === String(r.delivery_id)
                  ? null
                  : String(r.delivery_id),
              )
            }
          />
        )}
        {expandedDelivery && (() => {
          const d = deliveries?.find(
            (x) => x.delivery_id === expandedDelivery,
          );
          return d ? (
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">
                  {t("payload")} — {d.event_type}
                </span>
                <button
                  onClick={() => setExpandedDelivery(null)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {t("close")}
                </button>
              </div>
              <OJsonViewer
                data={d.payload}
                defaultExpandDepth={2}
              />
            </div>
          ) : null;
        })()}
      </section>

      {showDelete && (
        <OConfirmDialog
          open
          title={t("deleteConfirm")}
          description={t("deleteDescriptionUndo", { name: sub.name })}
          confirmLabel={tc("delete")}
          danger
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
