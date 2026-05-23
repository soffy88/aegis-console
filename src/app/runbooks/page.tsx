"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ODataTable } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";

interface Runbook {
  name: string;
  description: string;
  trigger: string;
  requires_approval: boolean;
  steps: { name: string; type: string; command: string }[];
}

type ColDef<T> = ODataTableData<T>["columns"][number];

const columns: ColDef<Runbook>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "description", header: "Description" },
  { accessorKey: "trigger", header: "Trigger" },
  { accessorKey: "requires_approval", header: "Approval", cell: ({ row }) => row.original.requires_approval ? "Yes" : "No" },
];

export default function RunbooksPage() {
  const router = useRouter();
  const [confirm, setConfirm] = useState<string | null>(null);

  const { data, isLoading } = useQuery<Runbook[]>({
    queryKey: ["runbooks"],
    queryFn: () => aegisFetch<Runbook[]>("/api/v1/runbooks"),
  });

  const dryRun = useMutation({
    mutationFn: (name: string) => aegisFetch<{ id: string }>(`/api/v1/runbooks/${name}/execute`, {
      method: "POST", body: JSON.stringify({ dry_run: true }),
    }),
    onSuccess: (result) => router.push(`/runbooks/executions/${result.id}`),
  });

  const liveRun = useMutation({
    mutationFn: (name: string) => aegisFetch<{ id: string }>(`/api/v1/runbooks/${name}/execute`, {
      method: "POST", body: JSON.stringify({ dry_run: false }),
    }),
    onSuccess: (result) => router.push(`/runbooks/executions/${result.id}`),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Runbooks</h1>
      <ODataTable<Runbook>
        data={data ? { columns, rows: data } : null}
        loading={isLoading}
        empty={data?.length === 0}
      />
      {data?.map((rb) => (
        <div key={rb.name} className="flex items-center gap-2 border rounded p-3">
          <span className="font-medium flex-1">{rb.name}</span>
          <button onClick={() => dryRun.mutate(rb.name)} className="rounded bg-blue-100 px-3 py-1 text-sm hover:bg-blue-200">
            Dry Run
          </button>
          <button onClick={() => setConfirm(rb.name)} className="rounded bg-red-100 px-3 py-1 text-sm hover:bg-red-200">
            Execute Live
          </button>
          {confirm === rb.name && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-red-600">Confirm?</span>
              <button onClick={() => { liveRun.mutate(rb.name); setConfirm(null); }} className="rounded bg-red-500 px-2 py-0.5 text-xs text-white">Yes</button>
              <button onClick={() => setConfirm(null)} className="rounded bg-gray-200 px-2 py-0.5 text-xs">No</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
