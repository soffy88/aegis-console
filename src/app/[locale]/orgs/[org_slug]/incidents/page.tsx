"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ODataTable } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  started_at: string;
  resolved_at: string | null;
  postmortem_md: string | null;
}

type ColDef<T> = ODataTableData<T>["columns"][number];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  warning: "bg-yellow-100 text-yellow-800",
  info: "bg-blue-100 text-blue-800",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
};

export default function IncidentsPage() {
  const { org_slug } = useParams<{ org_slug: string }>();
  const router = useRouter();
  const orgId = useOrgIdBySlug(org_slug);

  const columns: ColDef<Incident>[] = [
    { accessorKey: "title", header: "Title" },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => (
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${SEVERITY_COLORS[row.original.severity] ?? "bg-gray-100 text-gray-800"}`}>
          {row.original.severity}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[row.original.status] ?? "bg-gray-100 text-gray-800"}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "started_at",
      header: "Started",
      cell: ({ row }) => new Date(row.original.started_at).toLocaleString(),
    },
    {
      accessorKey: "resolved_at",
      header: "Resolved",
      cell: ({ row }) =>
        row.original.resolved_at
          ? new Date(row.original.resolved_at).toLocaleString()
          : "—",
    },
    {
      accessorKey: "postmortem_md",
      header: "Postmortem",
      cell: ({ row }) =>
        row.original.postmortem_md ? (
          <span className="text-xs text-green-600">✓ Generated</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  const { data, isLoading, error } = useQuery<Incident[]>({
    queryKey: ["incidents", orgId],
    queryFn: () => aegisFetch<Incident[]>(paths.incidents(orgId!)),
    enabled: !!orgId,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Incidents</h1>
      <ODataTable<Incident>
        data={data ? { columns, rows: data } : null}
        loading={isLoading}
        error={error as Error | null}
        empty={data?.length === 0}
        sortable
        onRowClick={(row) => router.push(`/orgs/${org_slug}/incidents/${row.id}`)}
      />
    </div>
  );
}
