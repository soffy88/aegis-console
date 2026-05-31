"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  OStatusBadge,
  OJsonViewer,
  OFormField,
  OLoadingState,
  OErrorState,
  OConfirmDialog,
} from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import { useProjectIdBySlug } from "@/hooks/use-project-id";
import { usePermission } from "@/lib/auth/use-permission";
import type { ReleaseGate, ReleaseGateDecideRequest } from "@/types/aegis";

type StatusVariant = "warning" | "active" | "error" | "inactive";
const STATE_BADGE: Record<string, StatusVariant> = {
  pending: "warning",
  approved: "active",
  rejected: "error",
  expired: "inactive",
};

export default function ReleaseGateDetailPage() {
  const { org_slug, project_slug, gate_id } = useParams<{
    org_slug: string;
    project_slug: string;
    gate_id: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orgId = useOrgIdBySlug(org_slug);
  const projectId = useProjectIdBySlug(orgId, project_slug);
  const { canOperate } = usePermission();

  const [pendingDecision, setPendingDecision] = useState<
    "approved" | "rejected" | null
  >(null);
  const [reason, setReason] = useState("");
  const [decideError, setDecideError] = useState<string | null>(null);

  const {
    data: gate,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["release-gate", orgId, projectId, gate_id],
    queryFn: async (): Promise<ReleaseGate> => {
      if (!orgId || !projectId) throw new Error("missing org or project");
      return aegisFetch<ReleaseGate>(
        paths.releaseGateGet(orgId, projectId, gate_id),
      );
    },
    enabled: !!orgId && !!projectId,
    refetchInterval: 30_000,
  });

  const decideMutation = useMutation({
    mutationFn: async (body: ReleaseGateDecideRequest) => {
      if (!orgId || !projectId) throw new Error("missing context");
      return aegisFetch<ReleaseGate>(
        paths.releaseGateDecide(orgId, projectId, gate_id),
        { method: "POST", body: JSON.stringify(body) },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["release-gate", orgId, projectId, gate_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["release-gates", orgId, projectId],
      });
      setPendingDecision(null);
      setReason("");
      setDecideError(null);
    },
    onError: (e: Error) => {
      setDecideError(e.message);
      setPendingDecision(null);
    },
  });

  if (isLoading) return <OLoadingState message="Loading release gate…" />;
  if (queryError || !gate)
    return (
      <OErrorState
        error={queryError instanceof Error ? queryError.message : "Not found"}
      />
    );

  const submitDecision = () => {
    if (!pendingDecision || !reason.trim()) return;
    decideMutation.mutate({
      decision: pendingDecision,
      decision_reason: reason.trim(),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="space-y-2">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to release gates
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-mono">{gate.action_kind}</h1>
          <OStatusBadge status={STATE_BADGE[gate.state]} label={gate.state} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Gate ID</div>
          <div className="font-mono">{gate.gate_id}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Requested by</div>
          <div className="font-mono">{gate.requested_by.slice(0, 8)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Requested at</div>
          <div>{new Date(gate.requested_at).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Expires at</div>
          <div>{new Date(gate.expires_at).toLocaleString()}</div>
        </div>
        {gate.autoheal_event_id && (
          <div className="col-span-2">
            <div className="text-muted-foreground">Autoheal event</div>
            <div className="font-mono">{gate.autoheal_event_id}</div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Action payload</h2>
        <OJsonViewer data={gate.action_payload} defaultExpandDepth={2} />
      </section>

      {gate.state === "pending" && canOperate && (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Decide</h2>
          <OFormField label="Reason (required)">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why approve or reject this gate?"
              rows={3}
              className="w-full rounded border bg-background px-3 py-2 text-sm"
            />
          </OFormField>
          {decideError && (
            <div className="text-sm text-destructive">{decideError}</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setPendingDecision("approved")}
              disabled={!reason.trim() || decideMutation.isPending}
              className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => setPendingDecision("rejected")}
              disabled={!reason.trim() || decideMutation.isPending}
              className="rounded bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:opacity-90 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </section>
      )}

      {gate.state === "pending" && !canOperate && (
        <section className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
          You need <code>TRIGGER_AUTOHEAL</code> permission (operator+) to
          decide.
        </section>
      )}

      {gate.state !== "pending" && (
        <section className="space-y-2 rounded-lg border bg-card p-4 text-sm">
          <h2 className="text-lg font-semibold">Decision</h2>
          <div>
            <span className="text-muted-foreground">By: </span>
            <span className="font-mono">
              {gate.decided_by?.slice(0, 8) ?? "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">At: </span>
            <span>
              {gate.decided_at
                ? new Date(gate.decided_at).toLocaleString()
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Reason: </span>
            <span className="whitespace-pre-wrap">
              {gate.decision_reason ?? "—"}
            </span>
          </div>
        </section>
      )}

      {pendingDecision !== null && (
        <OConfirmDialog
          open={pendingDecision !== null}
          onConfirm={submitDecision}
          onCancel={() => setPendingDecision(null)}
          title={
            pendingDecision === "approved"
              ? "Approve release gate?"
              : "Reject release gate?"
          }
          description={
            pendingDecision === "approved"
              ? `This will allow the ${gate.action_kind} action to proceed.`
              : `This will permanently reject the ${gate.action_kind} action. Cannot be undone.`
          }
          confirmLabel={pendingDecision === "approved" ? "Approve" : "Reject"}
          danger={pendingDecision === "rejected"}
        />
      )}
    </div>
  );
}
