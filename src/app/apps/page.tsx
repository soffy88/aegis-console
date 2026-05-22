"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ODataTable, OStatusBadge } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import type { App } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";

type ColDef<T> = ODataTableData<T>["columns"][number];

const columns: ColDef<App>[] = [
  {
    accessorKey: "app_name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/apps/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.app_name}
      </Link>
    ),
  },
  { accessorKey: "app_version", header: "Version" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <OStatusBadge label={row.original.status} />,
  },
  { accessorKey: "install_dir", header: "Directory" },
  { accessorKey: "domain", header: "Domain" },
];

export default function AppsPage() {
  const { data, isLoading, error } = useQuery<App[]>({
    queryKey: ["apps"],
    queryFn: () => aegisFetch<App[]>("/api/v1/apps"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Apps</h1>
        <Link
          href="/apps/install"
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Install App
        </Link>
      </div>
      <ODataTable<App>
        data={data ? { columns, rows: data } : null}
        loading={isLoading}
        error={error as Error | null}
        empty={data?.length === 0}
        sortable
      />
    </div>
  );
}
