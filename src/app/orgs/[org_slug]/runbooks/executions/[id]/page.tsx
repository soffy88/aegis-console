"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

interface StepResult {
  step_name: string;
  status: string;
  output: string;
}

interface Execution {
  id: string;
  runbook_name: string;
  status: string;
  dry_run: boolean;
  steps: StepResult[];
  approved_at: string | null;
}

export default function ExecutionPage() {
  const { org_slug, id } = useParams<{ org_slug: string; id: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Execution>({
    queryKey: ["execution", orgId, id],
    queryFn: () => aegisFetch<Execution>(paths.runbookExecution(orgId!, id)),
    enabled: !!orgId,
    refetchInterval: 2000,
  });

  const approve = useMutation({
    mutationFn: () => aegisFetch(`${paths.runbookExecution(orgId!, id)}/approve`, { method: "POST" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["execution", orgId, id] }),
  });

  if (isLoading) return <p>Loading…</p>;
  if (!data) return <p>Execution not found</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Execution: {data.runbook_name}</h1>
      <div className="flex items-center gap-3">
        <span className="rounded bg-gray-100 px-2 py-1 text-sm font-mono">{data.status}</span>
        {data.dry_run && <span className="text-xs text-blue-600">[DRY RUN]</span>}
      </div>

      {data.status === "awaiting_approval" && (
        <button onClick={() => approve.mutate()} className="rounded bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600">
          Approve &amp; Execute
        </button>
      )}

      <div className="space-y-2">
        {data.steps.map((step, i) => (
          <div key={i} className="rounded border p-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${step.status === "completed" || step.status === "would_execute" ? "bg-green-500" : step.status === "failed" ? "bg-red-500" : "bg-gray-300"}`} />
              <span className="font-medium text-sm">{step.step_name}</span>
              <span className="text-xs text-muted-foreground">{step.status}</span>
            </div>
            {step.output && <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">{step.output}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}
