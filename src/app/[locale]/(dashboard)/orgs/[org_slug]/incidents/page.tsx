"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
  critical: "bg-red-500/15 text-red-300",
  warning: "bg-yellow-500/15 text-yellow-300",
  info: "bg-blue-500/15 text-blue-300",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-orange-500/15 text-orange-300",
  resolved: "bg-green-500/15 text-green-300",
};

export default function IncidentsPage() {
  const t = useTranslations("incidents");
  const { org_slug } = useParams<{ org_slug: string }>();
  const router = useRouter();
  const orgId = useOrgIdBySlug(org_slug);

  const columns: ColDef<Incident>[] = [
    { accessorKey: "title", header: t("colTitle") },
    {
      accessorKey: "severity",
      header: t("colSeverity"),
      cell: ({ row }) => (
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${SEVERITY_COLORS[row.original.severity] ?? "bg-[var(--muted)] text-[var(--card-foreground)]"}`}>
          {row.original.severity}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("colStatus"),
      cell: ({ row }) => (
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[row.original.status] ?? "bg-[var(--muted)] text-[var(--card-foreground)]"}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "started_at",
      header: t("colStarted"),
      cell: ({ row }) => new Date(row.original.started_at).toLocaleString(),
    },
    {
      accessorKey: "resolved_at",
      header: t("colResolved"),
      cell: ({ row }) =>
        row.original.resolved_at
          ? new Date(row.original.resolved_at).toLocaleString()
          : "—",
    },
    {
      accessorKey: "postmortem_md",
      header: t("colPostmortem"),
      cell: ({ row }) =>
        row.original.postmortem_md ? (
          <span className="text-xs text-green-400">{t("postmortemGenerated")}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  const { data, isLoading, error } = useQuery<Incident[]>({
    queryKey: ["incidents", orgId],
    queryFn: () => aegisFetch<Incident[]>(paths.incidents(orgId!)),
    enabled: !!orgId,
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
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
