"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OStatusBadge, OJsonViewer } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import type { Node, Container } from "@/types/aegis";

type ColDef<T> = ODataTableData<T>["columns"][number];

export default function NodePage() {
  const t = useTranslations("nodes");
  const tc = useTranslations("common");
  const tcont = useTranslations("containers");
  const { org_slug, node_id } = useParams<{ org_slug: string; node_id: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const nodeQuery = useQuery<Node>({
    queryKey: ["node", orgId, node_id],
    queryFn: () => aegisFetch<Node>(paths.node(orgId!, node_id)),
    enabled: !!orgId && !!node_id,
  });

  const containersQuery = useQuery<Container[]>({
    queryKey: ["node-containers", orgId, node_id],
    queryFn: () => aegisFetch<Container[]>(paths.nodeContainers(orgId!, node_id)),
    enabled: !!orgId && !!node_id,
    refetchInterval: 5000,
  });

  const actionMutation = useMutation({
    mutationFn: ({ name, action }: { name: string; action: string }) => {
      const url =
        paths[`container${action.charAt(0).toUpperCase() + action.slice(1)}` as "containerStart"](
          orgId!,
          name,
        );
      return aegisFetch(`${url}?nodeId=${node_id}`, { method: "POST" });
    },
    onSuccess: () => {
      void containersQuery.refetch();
    },
  });

  const columns: ColDef<Container>[] = [
    { accessorKey: "name", header: tcont("name") },
    { accessorKey: "image", header: tcont("image") },
    {
      accessorKey: "status",
      header: tcont("status"),
      cell: ({ row }) => <OStatusBadge label={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {["start", "stop", "restart"].map((action) => (
            <button
              key={action}
              onClick={() => actionMutation.mutate({ name: row.original.name, action })}
              disabled={actionMutation.isPending}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)] capitalize disabled:opacity-50"
            >
              {tc(action)}
            </button>
          ))}
        </div>
      ),
    },
  ];

  if (nodeQuery.isLoading) return <p className="p-4">Loading node details...</p>;
  if (nodeQuery.error)
    return <p className="p-4 text-red-600">{(nodeQuery.error as Error).message}</p>;
  const node = nodeQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{node?.node_label}</h1>
        <span className="text-gray-500 font-mono">{node?.host}</span>
        {node && <OStatusBadge label={node.docker_mode} />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border p-4 shadow-sm bg-white">
          <p className="text-xs font-semibold uppercase text-gray-500">CPU</p>
          <p className="mt-1 text-2xl font-bold">{node?.cpus ?? "—"}</p>
        </div>
        <div className="rounded border p-4 shadow-sm bg-white">
          <p className="text-xs font-semibold uppercase text-gray-500">Memory</p>
          <p className="mt-1 text-2xl font-bold">
            {node?.memory_bytes ? (node.memory_bytes / 1024 ** 3).toFixed(1) + " GB" : "—"}
          </p>
        </div>
        <div className="rounded border p-4 shadow-sm bg-white">
          <p className="text-xs font-semibold uppercase text-gray-500">OS / Arch</p>
          <p className="mt-1 text-lg font-semibold leading-tight">
            {node?.os}
            <br />
            <span className="text-sm font-normal text-gray-500">{node?.arch}</span>
          </p>
        </div>
        <div className="rounded border p-4 shadow-sm bg-white">
          <p className="text-xs font-semibold uppercase text-gray-500">Docker Version</p>
          <p className="mt-1 text-lg font-semibold">{node?.server_version ?? "—"}</p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("nodeContainers")}</h2>
        <ODataTable<Container>
          data={containersQuery.data ? { columns, rows: containersQuery.data } : null}
          loading={containersQuery.isLoading}
          error={containersQuery.error as Error | null}
          empty={containersQuery.data?.length === 0}
          sortable
        />
      </section>

      <section className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--muted)] p-4">
        <h2 className="text-xs font-semibold uppercase text-gray-500">{t("rawInfo")}</h2>
        <OJsonViewer data={node ?? null} defaultExpandDepth={1} />
      </section>
    </div>
  );
}
