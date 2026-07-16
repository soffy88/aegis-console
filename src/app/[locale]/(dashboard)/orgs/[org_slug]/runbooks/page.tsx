"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

interface Runbook {
  name: string;
  description: string;
  trigger: string;
  requires_approval: boolean;
  version?: string;
  source: "yaml" | "plugin";
  steps: { name: string; type: string; command: string }[];
}

type ColDef<T> = ODataTableData<T>["columns"][number];

export default function RunbooksPage() {
  const t = useTranslations("runbooks");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const router = useRouter();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const columns: ColDef<Runbook>[] = [
    { accessorKey: "name", header: tc("name") },
    { accessorKey: "description", header: t("colDescription") },
    { accessorKey: "trigger", header: t("colTrigger") },
    { accessorKey: "requires_approval", header: t("colApproval"), cell: ({ row }) => row.original.requires_approval ? tc("yes") : tc("no") },
    { accessorKey: "source", header: t("colSource"), cell: ({ row }) => (
      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${row.original.source === "plugin" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-blue-500/15 text-blue-300"}`}>
        {row.original.source}
      </span>
    )},
  ];

  const { data, isLoading, error } = useQuery<Runbook[]>({
    queryKey: ["runbooks", orgId],
    queryFn: () => aegisFetch<Runbook[]>(paths.runbooks(orgId!)),
    enabled: !!orgId,
  });

  const dryRun = useMutation({
    mutationFn: (name: string) => aegisFetch<{ id: string }>(`${paths.runbook(orgId!, name)}/execute`, {
      method: "POST", body: JSON.stringify({ dry_run: true }),
    }),
    onSuccess: (result) => { setRunError(null); router.push(`/orgs/${org_slug}/runbooks/executions/${result.id}`); },
    onError: (e: Error) => setRunError(e.message),
  });

  const liveRun = useMutation({
    mutationFn: (name: string) => aegisFetch<{ id: string }>(`${paths.runbook(orgId!, name)}/execute`, {
      method: "POST", body: JSON.stringify({ dry_run: false }),
    }),
    onSuccess: (result) => { setRunError(null); router.push(`/orgs/${org_slug}/runbooks/executions/${result.id}`); },
    onError: (e: Error) => setRunError(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <ODataTable<Runbook>
        data={data ? { columns, rows: data } : null}
        loading={isLoading}
        error={error as Error | null}
        empty={data?.length === 0}
      />
      {runError && <p className="text-sm text-destructive">{runError}</p>}
      {data?.map((rb) => (
        <div key={rb.name} className="flex items-center gap-2 border rounded p-3">
          <span className="font-medium flex-1">{rb.name}</span>
          {rb.source === "plugin" ? (
            <span className="text-xs text-muted-foreground italic">{t("pluginNote")}</span>
          ) : (
            <>
              <button onClick={() => dryRun.mutate(rb.name)} className="rounded-md border border-[var(--primary)] px-3 py-1 text-sm text-[var(--primary)] transition-colors hover:bg-[var(--primary-subtle)]">
                {t("dryRun")}
              </button>
              <button onClick={() => setConfirm(rb.name)} className="rounded-md border border-red-500/30 px-3 py-1 text-sm text-red-400 transition-colors hover:bg-red-500/10">
                {t("executeLive")}
              </button>
              {confirm === rb.name && (
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs text-destructive">{t("confirm")}</span>
                  <button onClick={() => { liveRun.mutate(rb.name); setConfirm(null); }} className="rounded bg-red-500 px-2 py-0.5 text-xs text-white">{tc("yes")}</button>
                  <button onClick={() => setConfirm(null)} className="rounded bg-[var(--muted)] px-2 py-0.5 text-xs">{tc("no")}</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
