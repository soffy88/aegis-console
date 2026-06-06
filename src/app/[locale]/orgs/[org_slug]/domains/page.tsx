"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ODataTable, OConfirmDialog, OFormField, OTextInput } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

interface EdgeRoute {
  "@id": string;
  match: { host: string[] }[];
  handle: { handler: string; upstreams: { dial: string }[] }[];
  terminal: boolean;
}

type ColDef<T> = ODataTableData<T>["columns"][number];

function domain(r: EdgeRoute): string {
  return r.match?.[0]?.host?.[0] ?? "—";
}

function upstream(r: EdgeRoute): string {
  return r.handle?.[0]?.upstreams?.[0]?.dial ?? "—";
}

export default function DomainsPage() {
  const t = useTranslations("domains");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();

  const columns: ColDef<EdgeRoute>[] = [
    { accessorKey: "@id", header: "ID", cell: ({ row }) => <code className="text-xs">{row.original["@id"]}</code> },
    { id: "domain", header: t("domain"), cell: ({ row }) => domain(row.original) },
    { id: "upstream", header: t("targetUrl"), cell: ({ row }) => upstream(row.original) },
  ];

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ domain: "", upstream: "", service_url: "" });

  const routes = useQuery<EdgeRoute[]>({
    queryKey: ["edge-routes", orgId],
    queryFn: () => aegisFetch<EdgeRoute[]>(paths.edgeRoutes(orgId!)),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      aegisFetch(paths.edgeRoutes(orgId!), { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["edge-routes", orgId] });
      setShowCreate(false);
      setForm({ domain: "", upstream: "", service_url: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (routeId: string) =>
      aegisFetch(paths.edgeRoute(orgId!, encodeURIComponent(routeId)), { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["edge-routes", orgId] });
      setDeletingId(null);
    },
  });

  function setField(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {showCreate ? tc("cancel") : t("add")}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
          className="space-y-4 rounded border p-4"
        >
          <OFormField label={t("domain")} htmlFor="domain" required>
            <OTextInput id="domain" value={form.domain} onChange={setField("domain")} placeholder="app.example.com" />
          </OFormField>
          <OFormField label={t("targetUrl")} htmlFor="upstream" required>
            <OTextInput id="upstream" value={form.upstream} onChange={setField("upstream")} placeholder="localhost:8080" />
          </OFormField>
          <OFormField label="Health-check URL" htmlFor="service_url">
            <OTextInput id="service_url" value={form.service_url} onChange={setField("service_url")} placeholder="http://localhost:8080/health" />
          </OFormField>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {createMutation.isPending ? t("creating") : tc("create")}
          </button>
        </form>
      )}

      <ODataTable<EdgeRoute>
        data={routes.data ? { columns, rows: routes.data } : null}
        loading={routes.isLoading}
        error={routes.error as Error | null}
        empty={routes.data?.length === 0}
        onRowClick={(row) => setDeletingId(row["@id"])}
        sortable
      />

      <OConfirmDialog
        open={deletingId !== null}
        title={t("removeTitle")}
        description={`Remove route "${deletingId}"? This will remove the Caddy routing entry.`}
        danger
        confirmLabel={tc("remove")}
        onConfirm={() => { if (deletingId) deleteMutation.mutate(deletingId); }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
