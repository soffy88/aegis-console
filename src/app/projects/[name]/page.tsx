"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ODataTable } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import type { Container } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";

type ColDef<T> = ODataTableData<T>["columns"][number];

const columns: ColDef<Container>[] = [
  {
    accessorKey: "name",
    header: "Container",
    cell: ({ row }) => (
      <Link href={`/containers/${row.original.name}`} className="font-medium hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "image", header: "Image" },
  { accessorKey: "status", header: "Status" },
];

export default function ProjectDetailPage() {
  const { name } = useParams<{ name: string }>();

  const { data, isLoading, error } = useQuery<Container[]>({
    queryKey: ["project-containers", name],
    queryFn: () => aegisFetch<Container[]>(`/api/v1/projects/${name}/containers`),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Project: {name}</h1>
      <ODataTable<Container>
        data={data ? { columns, rows: data } : null}
        loading={isLoading}
        error={error as Error | null}
        empty={data?.length === 0}
        sortable
      />
    </div>
  );
}
