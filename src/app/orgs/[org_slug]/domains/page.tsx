"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ODataTable, OConfirmDialog, OFormField, OTextInput } from "@helios/blocks";
import type { ODataTableData } from "@helios/blocks";
import type { Domain, DomainCreatePayload } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type ColDef<T> = ODataTableData<T>["columns"][number];

const columns: ColDef<Domain>[] = [
  { accessorKey: "domain", header: "Domain" },
  { accessorKey: "target_url", header: "Target URL" },
  { accessorKey: "tls_enabled", header: "TLS", cell: ({ row }) => (row.original.tls_enabled ? "Yes" : "No") },
  { accessorKey: "created_at", header: "Created", cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString() },
];

export default function DomainsPage() {
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<DomainCreatePayload>({ domain: "", target_url: "", tls_enabled: false });

  const domains = useQuery<Domain[]>({
    queryKey: ["domains", orgId],
    queryFn: () => aegisFetch<Domain[]>(paths.domains(orgId!)),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: DomainCreatePayload) =>
      aegisFetch(paths.domains(orgId!), { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["domains", orgId] });
      setShowCreate(false);
      setForm({ domain: "", target_url: "", tls_enabled: false });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (d: string) => aegisFetch(paths.domain(orgId!, encodeURIComponent(d)), { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["domains", orgId] });
      setDeletingDomain(null);
    },
  });

  function setField<K extends keyof DomainCreatePayload>(key: K, value: DomainCreatePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Domains</h1>
        <button onClick={() => setShowCreate((v) => !v)} className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {showCreate ? "Cancel" : "Add Domain"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4 rounded border p-4">
          <OFormField label="Domain" htmlFor="domain" required>
            <OTextInput id="domain" value={form.domain} onChange={(e) => setField("domain", e.target.value)} placeholder="app.example.com" />
          </OFormField>
          <OFormField label="Target URL" htmlFor="target_url" required>
            <OTextInput id="target_url" value={form.target_url} onChange={(e) => setField("target_url", e.target.value)} placeholder="http://localhost:8080" />
          </OFormField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.tls_enabled} onChange={(e) => setField("tls_enabled", e.target.checked)} />
            Enable TLS
          </label>
          <button type="submit" disabled={createMutation.isPending} className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>
        </form>
      )}

      <ODataTable<Domain>
        data={domains.data ? { columns, rows: domains.data } : null}
        loading={domains.isLoading}
        error={domains.error as Error | null}
        empty={domains.data?.length === 0}
        onRowClick={(row) => setDeletingDomain(row.domain)}
        sortable
      />

      <OConfirmDialog
        open={deletingDomain !== null}
        title="Remove Domain"
        description={`Remove routing for "${deletingDomain}"? This cannot be undone.`}
        danger
        confirmLabel="Remove"
        onConfirm={() => { if (deletingDomain) deleteMutation.mutate(deletingDomain); }}
        onCancel={() => setDeletingDomain(null)}
      />
    </div>
  );
}
