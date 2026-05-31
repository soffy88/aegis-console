"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  OHighDensityTable,
  OStatusBadge,
  OFilterChip,
  OEmptyState,
  OLoadingState,
  OErrorState,
} from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import { useProjectIdBySlug } from "@/hooks/use-project-id";
import type { ReleaseGate } from "@/types/aegis";

// OHighDensityTable requires T extends Record<string, unknown>
type GateRow = ReleaseGate & Record<string, unknown>;

const STATE_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

type StatusVariant = "warning" | "active" | "error" | "inactive";
const STATE_BADGE: Record<string, StatusVariant> = {
  pending: "warning",
  approved: "active",
  rejected: "error",
  expired: "inactive",
};

function formatExpiresIn(expiresAt: string, state: string): string {
  if (state !== "pending") return "—";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

export default function ReleaseGatesListPage() {
  const { org_slug, project_slug } = useParams<{
    org_slug: string;
    project_slug: string;
  }>();
  const router = useRouter();
  const orgId = useOrgIdBySlug(org_slug);
  const projectId = useProjectIdBySlug(orgId, project_slug);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["release-gates", orgId, projectId, selectedStates],
    queryFn: async (): Promise<ReleaseGate[]> => {
      if (!orgId || !projectId) return [];
      const stateParam =
        selectedStates.length === 1 ? `?state=${selectedStates[0]}` : "";
      return aegisFetch<ReleaseGate[]>(
        `${paths.releaseGatesList(orgId, projectId)}${stateParam}`,
      );
    },
    enabled: !!orgId && !!projectId,
    refetchInterval: 30_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (
      selectedStates.length === 0 ||
      selectedStates.length === STATE_OPTIONS.length
    )
      return data;
    return data.filter((g) => selectedStates.includes(g.state));
  }, [data, selectedStates]);

  if (isLoading) return <OLoadingState message="Loading release gates…" />;
  if (error)
    return (
      <OErrorState
        error={
          error instanceof Error ? error.message : "Failed to load release gates"
        }
      />
    );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Release Gates</h1>
        <p className="text-sm text-muted-foreground">
          High-risk autoheal actions awaiting human approval
        </p>
      </header>

      <OFilterChip
        label="State"
        options={STATE_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          count: data?.filter((g) => g.state === o.value).length ?? 0,
        }))}
        selected={selectedStates}
        onChange={setSelectedStates}
        showAll
        allLabel="All"
      />

      {filtered.length === 0 ? (
        <OEmptyState
          title="No release gates"
          description="No autoheal actions requiring approval"
        />
      ) : (
        <OHighDensityTable<GateRow>
          columns={[
            {
              key: "gate_id",
              header: "ID",
              format: (_v, g) => g.gate_id.slice(0, 8),
            },
            { key: "action_kind", header: "Action" },
            {
              key: "state",
              header: "State",
              format: (_v, g) => (
                <OStatusBadge
                  status={STATE_BADGE[String(g.state)]}
                  label={String(g.state)}
                />
              ),
            },
            {
              key: "requested_at",
              header: "Requested",
              format: (_v, g) => new Date(String(g.requested_at)).toLocaleString(),
            },
            {
              key: "expires_at",
              header: "Expires in",
              format: (_v, g) =>
                formatExpiresIn(String(g.expires_at), String(g.state)),
            },
          ]}
          rows={filtered as GateRow[]}
          rowKey="gate_id"
          onRowClick={(g) =>
            router.push(
              `/orgs/${org_slug}/projects/${project_slug}/release-gates/${g.gate_id}`,
            )
          }
        />
      )}
    </div>
  );
}
