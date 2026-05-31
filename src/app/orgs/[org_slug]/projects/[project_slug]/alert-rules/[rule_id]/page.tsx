"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  OHighDensityTable,
  OStatusBadge,
  OFormField,
  OLoadingState,
  OErrorState,
} from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import { useProjectIdBySlug } from "@/hooks/use-project-id";
import { usePermission } from "@/lib/auth/use-permission";
import type { AlertRule, AlertRuleUpdate, AlertFiredHistory } from "@/types/aegis";

type FiredRow = AlertFiredHistory & Record<string, unknown>;

const OPERATORS = [">=", ">", "<", "<=", "=="] as const;
const SEV_BADGE: Record<string, "warning" | "error"> = {
  warn: "warning",
  critical: "error",
};

export default function AlertRuleDetailPage() {
  const { org_slug, project_slug, rule_id } = useParams<{
    org_slug: string;
    project_slug: string;
    rule_id: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orgId = useOrgIdBySlug(org_slug);
  const projectId = useProjectIdBySlug(orgId, project_slug);
  const { canWrite } = usePermission();

  const [editForm, setEditForm] = useState<AlertRuleUpdate>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    data: rule,
    isLoading: ruleLoading,
    error: ruleError,
  } = useQuery({
    queryKey: ["alert-rule", orgId, projectId, rule_id],
    queryFn: (): Promise<AlertRule> => {
      if (!orgId || !projectId) throw new Error("missing context");
      return aegisFetch<AlertRule>(paths.alertRuleGet(orgId, projectId, rule_id));
    },
    enabled: !!orgId && !!projectId,
  });

  const { data: firedHistory } = useQuery({
    queryKey: ["alert-fired", orgId, projectId],
    queryFn: (): Promise<AlertFiredHistory[]> => {
      if (!orgId || !projectId) return Promise.resolve([]);
      return aegisFetch<AlertFiredHistory[]>(paths.alertFiredList(orgId, projectId));
    },
    enabled: !!orgId && !!projectId,
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (body: AlertRuleUpdate) => {
      if (!orgId || !projectId) throw new Error("missing context");
      return aegisFetch<AlertRule>(paths.alertRuleUpdate(orgId, projectId, rule_id), {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rule", orgId, projectId, rule_id] });
      queryClient.invalidateQueries({ queryKey: ["alert-rules", orgId, projectId] });
      setEditForm({});
      setSaveError(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  if (ruleLoading) return <OLoadingState message="Loading alert rule…" />;
  if (ruleError || !rule)
    return (
      <OErrorState
        error={ruleError instanceof Error ? ruleError.message : "Rule not found"}
      />
    );

  const ruleForEdit = rule;

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="space-y-2">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to alert rules
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-mono">{rule.name}</h1>
          <OStatusBadge
            status={rule.enabled ? "active" : "inactive"}
            label={rule.enabled ? "enabled" : "disabled"}
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: rule config */}
        <section className="space-y-2 text-sm">
          <h2 className="font-semibold text-base">Configuration</h2>
          <div>
            <span className="text-muted-foreground">Metric: </span>
            <span className="font-mono">{rule.metric}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Operator: </span>
            <span className="font-mono">{rule.operator}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Warn threshold: </span>
            <span>{rule.threshold_warn ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Critical threshold: </span>
            <span>{rule.threshold_critical ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Throttle: </span>
            <span>{rule.throttle_seconds}s</span>
          </div>
          <div>
            <span className="text-muted-foreground">Escalation delay: </span>
            <span>{rule.escalation_delay_seconds}s</span>
          </div>
          <div>
            <span className="text-muted-foreground">Dedup bucket: </span>
            <span>{rule.dedup_bucket_seconds}s</span>
          </div>
        </section>

        {/* Right: edit form */}
        {canWrite && (
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="font-semibold text-base">Edit</h2>
            <OFormField label="Name">
              <input
                type="text"
                defaultValue={ruleForEdit.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label="Metric">
              <input
                type="text"
                defaultValue={ruleForEdit.metric}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, metric: e.target.value }))
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label="Operator">
              <select
                defaultValue={ruleForEdit.operator}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    operator: e.target.value as AlertRuleUpdate["operator"],
                  }))
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              >
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </OFormField>
            <div className="grid grid-cols-2 gap-2">
              <OFormField label="Warn">
                <input
                  type="number"
                  defaultValue={ruleForEdit.threshold_warn ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      threshold_warn: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                />
              </OFormField>
              <OFormField label="Critical">
                <input
                  type="number"
                  defaultValue={ruleForEdit.threshold_critical ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      threshold_critical: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                />
              </OFormField>
            </div>
            <OFormField label="Throttle (s)">
              <input
                type="number"
                defaultValue={ruleForEdit.throttle_seconds}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    throttle_seconds: Number(e.target.value),
                  }))
                }
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label="Enabled">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={ruleForEdit.enabled}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, enabled: e.target.checked }))
                  }
                />
                Enabled
              </label>
            </OFormField>
            {saveError && (
              <div className="text-sm text-destructive">{saveError}</div>
            )}
            {saveSuccess && (
              <div className="text-sm text-green-600">Saved ✓</div>
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
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </button>
          </section>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent fires</h2>
        {!firedHistory?.length ? (
          <p className="text-sm text-muted-foreground">No fires recorded yet.</p>
        ) : (
          <OHighDensityTable<FiredRow>
            columns={[
              {
                key: "severity",
                header: "Severity",
                format: (_v, r) => (
                  <OStatusBadge
                    status={SEV_BADGE[String(r.severity)] ?? "inactive"}
                    label={String(r.severity)}
                  />
                ),
              },
              {
                key: "current_value",
                header: "Value",
                format: (_v, r) =>
                  r.current_value != null ? String(r.current_value) : "—",
              },
              {
                key: "fired_at",
                header: "Fired at",
                format: (_v, r) =>
                  new Date(String(r.fired_at)).toLocaleString(),
              },
              {
                key: "last_seen_at",
                header: "Last seen",
                format: (_v, r) =>
                  new Date(String(r.last_seen_at)).toLocaleString(),
              },
              {
                key: "escalated_at",
                header: "Escalated",
                format: (_v, r) =>
                  r.escalated_at ? (
                    <OStatusBadge status="error" label="escalated" />
                  ) : (
                    "—"
                  ),
              },
            ]}
            rows={firedHistory as FiredRow[]}
            rowKey="fired_id"
          />
        )}
      </section>
    </div>
  );
}
