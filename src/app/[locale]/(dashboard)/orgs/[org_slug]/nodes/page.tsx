"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OStatusBadge, OFormField, OTextInput } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import type { Node, NodeRegisterPayload } from "@/types/aegis";

type ColDef<T> = ODataTableData<T>["columns"][number];

export default function NodesPage() {
  const t = useTranslations("nodes");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<NodeRegisterPayload>({
    host: "",
    node_label: "",
    ssh_username: "root",
    docker_connection_mode: "auto",
    ssh_port: 22,
  });

  const { data: nodes, isLoading, error } = useQuery<Node[]>({
    queryKey: ["nodes", orgId],
    queryFn: () => aegisFetch<Node[]>(paths.nodes(orgId!)),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const registerMutation = useMutation({
    mutationFn: (payload: NodeRegisterPayload) =>
      aegisFetch(paths.nodeRegister(orgId!), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setIsModalOpen(false);
      void qc.invalidateQueries({ queryKey: ["nodes", orgId] });
    },
  });

  const columns: ColDef<Node>[] = [
    {
      accessorKey: "node_label",
      header: t("label"),
      cell: ({ row }) => (
        <Link
          href={`/orgs/${org_slug}/nodes/${row.original.node_id}`}
          className="text-blue-600 hover:underline"
        >
          {row.original.node_label}
        </Link>
      ),
    },
    { accessorKey: "host", header: t("host") },
    {
      accessorKey: "docker_mode",
      header: t("mode"),
      cell: ({ row }) => <OStatusBadge label={row.original.docker_mode} />,
    },
    {
      id: "os_arch",
      header: t("osArch"),
      cell: ({ row }) =>
        row.original.os ? `${row.original.os} / ${row.original.arch}` : "—",
    },
    {
      id: "cpu_mem",
      header: t("cpuMem"),
      cell: ({ row }) => {
        if (row.original.cpus === null) return "—";
        const memGb = row.original.memory_bytes
          ? (row.original.memory_bytes / 1024 ** 3).toFixed(1)
          : "?";
        return `${row.original.cpus} CPU / ${memGb} GB`;
      },
    },
    {
      id: "containers",
      header: t("containers"),
      cell: ({ row }) =>
        row.original.containers_total !== undefined
          ? `${row.original.containers_running} / ${row.original.containers_total}`
          : "—",
    },
    { accessorKey: "server_version", header: t("version") },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link
          href={`/orgs/${org_slug}/nodes/${row.original.node_id}`}
          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)]"
        >
          {tc("details")}
        </Link>
      ),
    },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    registerMutation.mutate(formData);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {t("register")}
        </button>
      </div>

      <ODataTable<Node>
        data={nodes ? { columns, rows: nodes } : null}
        loading={isLoading}
        error={error as Error | null}
        empty={nodes?.length === 0}
        sortable
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl text-gray-900">
            <h2 className="mb-4 text-xl font-bold">{t("register")}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <OFormField label={t("host")}>
                <OTextInput
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="1.2.3.4 or my-node.local"
                  required
                />
              </OFormField>
              <OFormField label={t("label")}>
                <OTextInput
                  value={formData.node_label}
                  onChange={(e) => setFormData({ ...formData, node_label: e.target.value })}
                  placeholder="e.g. prod-worker-1"
                  required
                />
              </OFormField>
              <OFormField label="SSH Username">
                <OTextInput
                  value={formData.ssh_username}
                  onChange={(e) => setFormData({ ...formData, ssh_username: e.target.value })}
                />
              </OFormField>
              <OFormField label="Docker Mode">
                <select
                  className="w-full rounded border p-2"
                  value={formData.docker_connection_mode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      docker_connection_mode: e.target.value as NodeRegisterPayload["docker_connection_mode"],
                    })
                  }
                >
                  <option value="auto">Auto</option>
                  <option value="tcp">TCP</option>
                  <option value="ssh">SSH</option>
                </select>
              </OFormField>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md px-4 py-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)]"
                >
                  {tc("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {registerMutation.isPending ? "..." : tc("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
