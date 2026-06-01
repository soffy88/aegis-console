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
import { useProjectIdBySlug } from "@/hooks/use-project-id";
import { usePermission } from "@/lib/auth/use-permission";
import type { AlertRule, AlertRuleCreate } from "@/types/aegis";

type RuleRow = AlertRule & Record<string, unknown>;

const OPERATORS = [">=", ">", "<", "<=", "=="] as const;

const defaultCreate: AlertRuleCreate = {
  name: "",
  metric: "",
  operator: ">=",
  threshold_warn: undefined,
  threshold_critical: undefined,
  throttle_seconds: 300,
  escalation_delay_seconds: 1800,
  dedup_bucket_seconds: 3600,
  enabled: true,
};

export default function AlertRulesListPage() {
  const { org_slug, project_slug } = useParams<{
    org_slug: string;
    project_slug: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orgId = useOrgIdBySlug(org_slug);
  const projectId = useProjectIdBySlug(orgId, project_slug);
  const { canWrite } = usePermission();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<AlertRuleCreate>(defaultCreate);
  const [deleteTarget, setDeleteTarget] = useState<AlertRule | null>(null);
  const [mutateError, setMutateError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["alert-rules", orgId, projectId],
    queryFn: (): Promise<AlertRule[]> => {
      if (!orgId || !projectId) return Promise.resolve([]);
      return aegisFetch<AlertRule[]>(paths.alertRulesList(orgId, projectId));
    },
    enabled: !!orgId && !!projectId,
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (body: AlertRuleCreate) => {
      if (!orgId || !projectId) throw new Error("missing context");
      return aegisFetch<AlertRule>(paths.alertRuleCreate(orgId, projectId), {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules", orgId, projectId] });
      setShowCreate(false);
      setForm(defaultCreate);
      setMutateError(null);
    },
    onError: (e: Error) => setMutateError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => {
      if (!orgId || !projectId) throw new Error("missing context");
      return aegisFetch<void>(paths.alertRuleDelete(orgId, projectId, ruleId), {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules", orgId, projectId] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => setMutateError(e.message),
  });

  if (isLoading) return <OLoadingState message="Loading alert rules…" />;
  if (error)
    return (
      <OErrorState
        error={error instanceof Error ? error.message : "Failed to load alert rules"}
      />
    );

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alert Rules</h1>
          <p className="text-sm text-muted-foreground">
            Threshold-based monitoring rules for this project
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            Create alert rule
          </button>
        )}
      </header>

      {showCreate && (
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-lg font-semibold">New alert rule</h2>
          <div className="grid grid-cols-2 gap-3">
            <OFormField label="Name">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="cpu-warn"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label="Metric">
              <input
                type="text"
                value={form.metric}
                onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}
                placeholder="container.cpu.percent"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label="Operator">
              <select
                value={form.operator}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    operator: e.target.value as AlertRuleCreate["operator"],
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
            <OFormField label="Warn threshold">
              <input
                type="number"
                value={form.threshold_warn ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    threshold_warn: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="70"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label="Critical threshold">
              <input
                type="number"
                value={form.threshold_critical ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    threshold_critical: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                placeholder="90"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </OFormField>
            <OFormField label="Enabled">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.enabled ?? true}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, enabled: e.target.checked }))
                  }
                />
                Enabled
              </label>
            </OFormField>
          </div>
          {mutateError && (
            <div className="text-sm text-destructive">{mutateError}</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name.trim() || !form.metric.trim() || createMutation.isPending}
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
          title="No alert rules"
          description="Create a rule to start monitoring metrics"
        />
      ) : (
        <OHighDensityTable<RuleRow>
          columns={[
            { key: "name", header: "Name" },
            { key: "metric", header: "Metric" },
            {
              key: "threshold_warn",
              header: "Warn",
              format: (_v, r) =>
                r.threshold_warn != null ? String(r.threshold_warn) : "—",
            },
            {
              key: "threshold_critical",
              header: "Critical",
              format: (_v, r) =>
                r.threshold_critical != null ? String(r.threshold_critical) : "—",
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
            { key: "operator", header: "Op" },
            {
              key: "actions",
              header: "",
              format: (_v, r) =>
                canWrite ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(r as AlertRule);
                    }}
                    className="text-destructive text-xs hover:underline"
                  >
                    Delete
                  </button>
                ) : null,
            },
          ]}
          rows={data as RuleRow[]}
          rowKey="rule_id"
          onRowClick={(r) =>
            router.push(
              `/orgs/${org_slug}/projects/${project_slug}/alert-rules/${r.rule_id}`,
            )
          }
        />
      )}

      {deleteTarget && (
        <OConfirmDialog
          open
          title="Delete alert rule?"
          description={`This will permanently delete "${deleteTarget.name}". Cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => deleteMutation.mutate(deleteTarget.rule_id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
