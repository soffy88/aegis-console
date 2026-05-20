"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, InstalledApp } from "@/lib/api";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Trash2, RefreshCw } from "lucide-react";

function InstallModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    app_name: "",
    install_dir: "",
    domain: "",
    domain_target_url: "",
    register_domain: false,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.apps.install({
        app_name: form.app_name,
        install_dir: form.install_dir || undefined,
        domain: form.domain || undefined,
        domain_target_url: form.domain_target_url || undefined,
        register_domain: form.register_domain,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["apps"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">Install App</h2>

        <label className="block space-y-1">
          <span className="text-sm text-slate-400">App name *</span>
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.app_name}
            onChange={(e) => setForm((f) => ({ ...f, app_name: e.target.value }))}
            placeholder="e.g. homeassistant"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Install dir</span>
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.install_dir}
            onChange={(e) => setForm((f) => ({ ...f, install_dir: e.target.value }))}
            placeholder="/opt/apps/homeassistant"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Domain</span>
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.domain}
            onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
            placeholder="ha.example.com"
          />
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="accent-indigo-500"
            checked={form.register_domain}
            onChange={(e) => setForm((f) => ({ ...f, register_domain: e.target.checked }))}
          />
          <span>Register domain via aegis-edge</span>
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
            disabled={!form.app_name || mutation.isPending}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? "Installing…" : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: apps = [], isLoading } = useQuery<InstalledApp[]>({
    queryKey: ["apps"],
    queryFn: api.apps.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.apps.uninstall(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apps"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Apps</h1>
        <div className="flex gap-2">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["apps"] })}
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
            Install
          </button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : apps.length === 0 ? (
          <p className="text-slate-400 text-sm">No apps installed yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-left border-b border-slate-800">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Domain</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Installed</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-slate-800/50 last:border-0"
                >
                  <td className="py-3 font-medium">{app.app_name}</td>
                  <td className="py-3 text-slate-400">{app.domain ?? "—"}</td>
                  <td className="py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="py-3 text-slate-400">
                    {new Date(app.installed_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => deleteMutation.mutate(app.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                      title="Uninstall"
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

      {showModal && <InstallModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
