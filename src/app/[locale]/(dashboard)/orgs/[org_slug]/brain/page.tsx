"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OStatusBadge, OJsonViewer } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type Tab = "triage" | "rca" | "plan";

// Loosely-typed shapes for the Brain agent's dynamic JSON responses — only the
// fields this page reads are declared; the rest is passed straight to OJsonViewer.
interface TriageResult {
  priority_score: number;
  should_escalate: boolean;
  classified_category: string;
  reason: string;
}
interface RcaHistoryStep {
  tool_name?: string;
  thought?: string;
  observation?: string;
}
interface RcaResult {
  final_answer?: string;
  status?: string;
  history?: RcaHistoryStep[];
}
interface PlanStep {
  plugin_id: string;
  description: string;
  params: unknown;
}
interface AgentStatus {
  status?: string;
  last_error?: string;
}
type BrainStatus = Record<string, AgentStatus | undefined>;

export default function BrainPage() {
  const t = useTranslations("brain");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const [activeTab, setActiveTab] = useState<Tab>("triage");
  const [triageErr, setTriageErr] = useState<string | null>(null);
  const [rcaErr, setRcaErr] = useState<string | null>(null);
  const [planErr, setPlanErr] = useState<string | null>(null);

  // Agent Status
  const statusQuery = useQuery<BrainStatus>({
    queryKey: ["brain-status", orgId],
    queryFn: () => aegisFetch<BrainStatus>(paths.brainStatus(orgId!)),
    enabled: !!orgId,
    refetchInterval: 10000,
  });

  // Triage state
  const [triageInput, setTriageInput] = useState(
    JSON.stringify(
      {
        alert_name: "high_cpu",
        severity: "warning",
        entity_id: "container:nginx",
        message: "CPU usage 92%",
      },
      null,
      2,
    ),
  );
  const triageMutation = useMutation<TriageResult, Error, unknown>({
    mutationFn: (signal: unknown) =>
      aegisFetch(paths.brainTriage(orgId!), {
        method: "POST",
        body: JSON.stringify({ signal }),
      }),
    onError: (e) => setTriageErr(e.message),
  });

  // RCA state
  const [rcaSignal, setRcaSignal] = useState(triageInput);
  const [rcaSeverity, setRcaSeverity] = useState("critical");
  const [rcaDeep, setRcaDeep] = useState(true);
  const investigateMutation = useMutation<RcaResult, Error, unknown>({
    mutationFn: (diagnose_result: unknown) =>
      aegisFetch(paths.brainInvestigate(orgId!), {
        method: "POST",
        body: JSON.stringify({ diagnose_result }),
      }),
    onError: (e) => setRcaErr(e.message),
  });

  // Plan state
  const [planInput, setPlanInput] = useState("");
  const planMutation = useMutation<PlanStep[], Error, unknown>({
    mutationFn: (investigation_result: unknown) =>
      aegisFetch(paths.brainPlan(orgId!), {
        method: "POST",
        body: JSON.stringify({ investigation_result }),
      }),
    onError: (e) => setPlanErr(e.message),
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* Agent Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {["triage", "rca", "planner"].map((key) => {
          const s = statusQuery.data?.[key];
          const status = s?.status || "not_initialized";
          return (
            <div key={key} className="rounded-lg border bg-[var(--card)] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase text-[var(--muted-foreground)]">{key}</span>
                <OStatusBadge label={status} />
              </div>
              {s?.last_error && <p className="mt-2 text-xs text-destructive">{s.last_error}</p>}
            </div>
          );
        })}
      </div>

      {/* Debug Tabs */}
      <div className="rounded-lg border bg-[var(--card)] shadow-sm overflow-hidden">
        <div className="flex border-b border-[var(--border)] bg-[var(--muted)]">
          {(["triage", "rca", "plan"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-r last:border-r-0 ${
                activeTab === tab ? "bg-[var(--card)] text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]"
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "triage" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold text-[var(--card-foreground)]">{t("signalInput")}</h3>
                <textarea
                  className="w-full h-64 rounded border p-4 font-mono text-xs focus:ring-1 focus:ring-[var(--primary)] outline-none"
                  value={triageInput}
                  onChange={(e) => setTriageInput(e.target.value)}
                />
                <button
                  onClick={() => {
                    let signal: unknown;
                    try {
                      signal = JSON.parse(triageInput);
                    } catch {
                      setTriageErr(t("invalidJson"));
                      return;
                    }
                    setTriageErr(null);
                    triageMutation.mutate(signal);
                  }}
                  disabled={triageMutation.isPending}
                  className="w-full rounded bg-[var(--primary)] py-2 text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
                >
                  {triageMutation.isPending ? t("processing") : t("runTriage")}
                </button>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-[var(--card-foreground)]">{t("result")}</h3>
                {triageMutation.data ? (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-center">
                        <p className="text-[10px] uppercase text-[var(--primary)]">{t("priority")}</p>
                        <p
                          className={`text-3xl font-bold ${
                            triageMutation.data.priority_score > 70
                              ? "text-destructive"
                              : triageMutation.data.priority_score > 40
                                ? "text-yellow-500"
                                : "text-green-400"
                          }`}
                        >
                          {triageMutation.data.priority_score}
                        </p>
                      </div>
                      <div className="flex-1 rounded-md border border-[var(--border)] bg-[var(--muted)] p-3 text-center">
                        <p className="text-[10px] uppercase text-[var(--muted-foreground)]">{t("escalate")}</p>
                        <OStatusBadge label={String(triageMutation.data.should_escalate)} />
                      </div>
                    </div>
                    <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] p-4">
                      <p className="text-sm font-semibold">{triageMutation.data.classified_category}</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{triageMutation.data.reason}</p>
                    </div>
                    <OJsonViewer data={triageMutation.data} defaultExpandDepth={1} />
                  </div>
                ) : triageErr ? (
                  <div className="flex h-64 items-center justify-center rounded border border-dashed text-destructive text-sm">
                    {triageErr}
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded border border-dashed text-[var(--muted-foreground)]">
                    {t("noResults")}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "rca" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold text-[var(--card-foreground)]">{t("inputData")}</h3>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rcaDeep}
                      onChange={(e) => setRcaDeep(e.target.checked)}
                    />
                    {t("deepInvestigation")}
                  </label>
                  <select
                    className="rounded border p-1"
                    value={rcaSeverity}
                    onChange={(e) => setRcaSeverity(e.target.value)}
                  >
                    <option value="critical">{t("severityCritical")}</option>
                    <option value="high">{t("severityHigh")}</option>
                    <option value="medium">{t("severityMedium")}</option>
                  </select>
                </div>
                <textarea
                  className="w-full h-64 rounded border p-4 font-mono text-xs focus:ring-1 focus:ring-[var(--primary)] outline-none"
                  value={rcaSignal}
                  onChange={(e) => setRcaSignal(e.target.value)}
                />
                <button
                  onClick={() => {
                    let parsed: Record<string, unknown>;
                    try {
                      parsed = JSON.parse(rcaSignal);
                    } catch {
                      setRcaErr(t("invalidJson"));
                      return;
                    }
                    setRcaErr(null);
                    investigateMutation.mutate({
                      ...parsed,
                      needs_deep_investigation: rcaDeep,
                      severity: rcaSeverity,
                    });
                  }}
                  disabled={investigateMutation.isPending}
                  className="w-full rounded bg-[var(--primary)] py-2 text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
                >
                  {investigateMutation.isPending ? t("investigating") : t("launchRca")}
                </button>
                {investigateMutation.isPending && (
                  <p className="text-center text-xs text-[var(--muted-foreground)] animate-pulse">
                    {t("agentWorking")}
                  </p>
                )}
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-[var(--card-foreground)]">{t("investigationResult")}</h3>
                {investigateMutation.data ? (
                  <div className="space-y-4">
                    <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-4">
                      <p className="text-lg font-bold text-[var(--card-foreground)]">
                        {investigateMutation.data.final_answer || t("investigationSkipped")}
                      </p>
                      {investigateMutation.data.status && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="font-semibold uppercase text-[var(--muted-foreground)]">{t("statusLabel")}</span>
                          <OStatusBadge label={investigateMutation.data.status} />
                        </div>
                      )}
                    </div>
                    {investigateMutation.data.history && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">{t("stepsHistory", { n: investigateMutation.data.history.length })}</p>
                        <div className="max-h-[400px] overflow-auto space-y-2">
                          {investigateMutation.data.history.map((step: RcaHistoryStep, idx: number) => (
                            <details key={idx} className="rounded border bg-[var(--card)] p-2">
                              <summary className="cursor-pointer text-xs font-mono">
                                {t("step", { n: idx + 1, name: step.tool_name || "thought" })}
                              </summary>
                              <div className="mt-2 space-y-2 pl-4 text-[10px]">
                                <p className="text-[var(--muted-foreground)] italic">{step.thought}</p>
                                <pre className="bg-[var(--muted)] p-2 rounded max-h-20 overflow-hidden text-[var(--muted-foreground)]">
                                  {step.observation?.slice(0, 200)}...
                                </pre>
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    )}
                    <OJsonViewer data={investigateMutation.data} defaultExpandDepth={0} />
                  </div>
                ) : rcaErr ? (
                  <div className="flex h-64 items-center justify-center rounded border border-dashed text-destructive text-sm">
                    {rcaErr}
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded border border-dashed text-[var(--muted-foreground)]">
                    {t("agentResultsPlaceholder")}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "plan" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold text-[var(--card-foreground)]">{t("pasteInvestigation")}</h3>
                <textarea
                  className="w-full h-64 rounded border p-4 font-mono text-xs focus:ring-1 focus:ring-[var(--primary)] outline-none"
                  placeholder={t("pastePlaceholder")}
                  value={planInput}
                  onChange={(e) => setPlanInput(e.target.value)}
                />
                <button
                  onClick={() => {
                    let body;
                    try {
                      body = JSON.parse(planInput);
                    } catch {
                      body = { final_answer: planInput };
                    }
                    setPlanErr(null);
                    planMutation.mutate(body);
                  }}
                  disabled={planMutation.isPending}
                  className="w-full rounded bg-[var(--primary)] py-2 text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
                >
                  {planMutation.isPending ? t("planning") : t("generatePlan")}
                </button>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-[var(--card-foreground)]">{t("remediationSteps")}</h3>
                {planMutation.data ? (
                  <div className="space-y-3">
                    {Array.isArray(planMutation.data) && planMutation.data.length > 0 ? (
                      planMutation.data.map((step: PlanStep, idx: number) => (
                        <div key={idx} className="rounded border p-3 bg-[var(--card)] shadow-sm space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-[var(--primary-foreground)]">
                              {idx + 1}
                            </span>
                            <span className="rounded bg-[var(--primary-subtle)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                              {step.plugin_id}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{step.description}</p>
                          <OJsonViewer data={step.params} defaultExpandDepth={0} />
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)] italic">
                        {t("noSteps")}
                      </p>
                    )}
                    <OJsonViewer data={planMutation.data} defaultExpandDepth={0} />
                  </div>
                ) : planErr ? (
                  <div className="flex h-64 items-center justify-center rounded border border-dashed text-destructive text-sm">
                    {planErr}
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded border border-dashed text-[var(--muted-foreground)]">
                    {t("stepsPlaceholder")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
