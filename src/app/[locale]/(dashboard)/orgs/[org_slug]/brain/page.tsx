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
  });

  // Plan state
  const [planInput, setPlanInput] = useState("");
  const planMutation = useMutation<PlanStep[], Error, unknown>({
    mutationFn: (investigation_result: unknown) =>
      aegisFetch(paths.brainPlan(orgId!), {
        method: "POST",
        body: JSON.stringify({ investigation_result }),
      }),
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
            <div key={key} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase text-gray-500">{key}</span>
                <OStatusBadge label={status} />
              </div>
              {s?.last_error && <p className="mt-2 text-xs text-red-600">{s.last_error}</p>}
            </div>
          );
        })}
      </div>

      {/* Debug Tabs */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="flex border-b border-[var(--border)] bg-[var(--muted)]">
          {(["triage", "rca", "plan"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-r last:border-r-0 ${
                activeTab === tab ? "bg-white text-blue-600" : "text-gray-500 hover:text-gray-700"
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
                <h3 className="font-semibold text-gray-900">Signal Input (JSON)</h3>
                <textarea
                  className="w-full h-64 rounded border p-4 font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  value={triageInput}
                  onChange={(e) => setTriageInput(e.target.value)}
                />
                <button
                  onClick={() => triageMutation.mutate(JSON.parse(triageInput))}
                  disabled={triageMutation.isPending}
                  className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {triageMutation.isPending ? "Processing..." : "Run Triage"}
                </button>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Result</h3>
                {triageMutation.data ? (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-center">
                        <p className="text-[10px] uppercase text-blue-600">Priority</p>
                        <p
                          className={`text-3xl font-bold ${
                            triageMutation.data.priority_score > 70
                              ? "text-red-600"
                              : triageMutation.data.priority_score > 40
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        >
                          {triageMutation.data.priority_score}
                        </p>
                      </div>
                      <div className="flex-1 rounded-md border border-[var(--border)] bg-[var(--muted)] p-3 text-center">
                        <p className="text-[10px] uppercase text-gray-500">Escalate</p>
                        <OStatusBadge label={String(triageMutation.data.should_escalate)} />
                      </div>
                    </div>
                    <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] p-4">
                      <p className="text-sm font-semibold">{triageMutation.data.classified_category}</p>
                      <p className="mt-1 text-sm text-gray-600">{triageMutation.data.reason}</p>
                    </div>
                    <OJsonViewer data={triageMutation.data} defaultExpandDepth={1} />
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded border border-dashed text-gray-400">
                    No results yet
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "rca" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Input Data</h3>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rcaDeep}
                      onChange={(e) => setRcaDeep(e.target.checked)}
                    />
                    Deep Investigation
                  </label>
                  <select
                    className="rounded border p-1"
                    value={rcaSeverity}
                    onChange={(e) => setRcaSeverity(e.target.value)}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>
                <textarea
                  className="w-full h-64 rounded border p-4 font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  value={rcaSignal}
                  onChange={(e) => setRcaSignal(e.target.value)}
                />
                <button
                  onClick={() =>
                    investigateMutation.mutate({
                      ...JSON.parse(rcaSignal),
                      needs_deep_investigation: rcaDeep,
                      severity: rcaSeverity,
                    })
                  }
                  disabled={investigateMutation.isPending}
                  className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {investigateMutation.isPending ? "Investigating..." : "Launch RCA Agent"}
                </button>
                {investigateMutation.isPending && (
                  <p className="text-center text-xs text-gray-500 animate-pulse">
                    Agent is working... (Up to 30s)
                  </p>
                )}
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Investigation Result</h3>
                {investigateMutation.data ? (
                  <div className="space-y-4">
                    <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-4">
                      <p className="text-lg font-bold text-blue-900">
                        {investigateMutation.data.final_answer || "Investigation Skipped"}
                      </p>
                      {investigateMutation.data.status && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="font-semibold uppercase text-gray-500">Status:</span>
                          <OStatusBadge label={investigateMutation.data.status} />
                        </div>
                      )}
                    </div>
                    {investigateMutation.data.history && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Steps History ({investigateMutation.data.history.length})</p>
                        <div className="max-h-[400px] overflow-auto space-y-2">
                          {investigateMutation.data.history.map((step: RcaHistoryStep, idx: number) => (
                            <details key={idx} className="rounded border bg-white p-2">
                              <summary className="cursor-pointer text-xs font-mono">
                                Step {idx + 1}: {step.tool_name || "thought"}
                              </summary>
                              <div className="mt-2 space-y-2 pl-4 text-[10px]">
                                <p className="text-gray-500 italic">{step.thought}</p>
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
                ) : (
                  <div className="flex h-64 items-center justify-center rounded border border-dashed text-gray-400">
                    Agent results will appear here
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "plan" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Paste Investigation Result</h3>
                <textarea
                  className="w-full h-64 rounded border p-4 font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="Paste final answer or full RCA JSON..."
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
                    planMutation.mutate(body);
                  }}
                  disabled={planMutation.isPending}
                  className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {planMutation.isPending ? "Planning..." : "Generate Action Plan"}
                </button>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Remediation Steps</h3>
                {planMutation.data ? (
                  <div className="space-y-3">
                    {Array.isArray(planMutation.data) && planMutation.data.length > 0 ? (
                      planMutation.data.map((step: PlanStep, idx: number) => (
                        <div key={idx} className="rounded border p-3 bg-white shadow-sm space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
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
                      <p className="text-sm text-gray-500 italic">
                        {t("noSteps")}
                      </p>
                    )}
                    <OJsonViewer data={planMutation.data} defaultExpandDepth={0} />
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded border border-dashed text-gray-400">
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
