"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Domain } from "@/lib/api";
import { Card } from "@/components/Card";
import { Plus, Trash2, RefreshCw, CheckCircle, XCircle } from "lucide-react";

function AddDomainModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    domain: "",
    target_url: "",
    tls_mode: "auto" as "auto" | "on_demand" | "off",
  });

  const mutation = useMutation({
    mutationFn: () => api.domains.register(form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["domains"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">Add Domain</h2>

        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Domain *</span>
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.domain}
            onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
            placeholder="ha.example.com"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Target URL *</span>
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.target_url}
            onChange={(e) => setForm((f) => ({ ...f, target_url: e.target.value }))}
            placeholder="http://localhost:8123"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-slate-400">TLS mode</span>
          <select
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.tls_mode}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                tls_mode: e.target.value as "auto" | "on_demand" | "off",
              }))
            }
          >
            <option value="auto">auto (ACME)</option>
            <option value="on_demand">on_demand</option>
            <option value="off">off (no TLS)</option>
          </select>
        </label>

        {mutation.isError && (
          <p className="text-red-400 text-sm">{String(mutation.error)}</p>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-700 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.domain || !form.target_url || mutation.isPending}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? "Registering…" : "Add Domain"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DomainsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: domains = [], isLoading } = useQuery<Domain[]>({
    queryKey: ["domains"],
    queryFn: api.domains.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (domain: string) => api.domains.delete(domain),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domains"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Domains</h1>
        <div className="flex gap-2">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["domains"] })}
            className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500"
          >
            <Plus size={16} />
            Add Domain
          </button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : domains.length === 0 ? (
          <p className="text-slate-400 text-sm">No domains registered yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-left border-b border-slate-800">
                <th className="pb-3 font-medium">Domain</th>
                <th className="pb-3 font-medium">Target</th>
                <th className="pb-3 font-medium">TLS</th>
                <th className="pb-3 font-medium">Added</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr
                  key={d.domain}
                  className="border-b border-slate-800/50 last:border-0"
                >
                  <td className="py-3 font-medium text-indigo-300">{d.domain}</td>
                  <td className="py-3 text-slate-400 font-mono text-xs">
                    {d.target_url}
                  </td>
                  <td className="py-3">
                    {d.tls_enabled ? (
                      <CheckCircle size={16} className="text-green-400" />
                    ) : (
                      <XCircle size={16} className="text-slate-500" />
                    )}
                  </td>
                  <td className="py-3 text-slate-400">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => deleteMutation.mutate(d.domain)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showModal && <AddDomainModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
