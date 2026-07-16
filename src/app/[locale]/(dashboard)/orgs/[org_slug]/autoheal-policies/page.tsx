"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OConfirmDialog } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

interface Policy {
  id: string;
  name: string;
  target_container: string;
  trigger_metric: string;
  trigger_operator: string;
  trigger_threshold: number;
  action: string;
  dry_run: boolean;
  cooldown_seconds: number;
  enabled: boolean;
  last_triggered_at: string | null;
}

const OPS = [">=", ">", "<", "<=", "=="];

export default function AutohealPoliciesPage() {
  const t = useTranslations("autohealPolicies");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", target_container: "", trigger_metric: "probe_up",
    trigger_operator: "<", trigger_threshold: 1, cooldown_seconds: 300, dry_run: true,
  });
  const [err, setErr] = useState<string | null>(null);
  // Turning dry_run OFF makes the policy really restart containers — confirm it.
  const [confirmLive, setConfirmLive] = useState<Policy | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Policy | null>(null);

  const policies = useQuery<Policy[]>({
    queryKey: ["autoheal-policies", orgId],
    queryFn: () => aegisFetch<Policy[]>(paths.autohealPolicies(orgId!)),
    enabled: !!orgId,
    refetchInterval: 20000,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["autoheal-policies", orgId] });

  const create = useMutation({
    mutationFn: () => aegisFetch(paths.autohealPolicies(orgId!), { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      setForm({ ...form, name: "", target_container: "" });
      setErr(null);
      invalidate();
    },
    onError: (e: Error) => setErr(e.message),
  });
  const patch = useMutation({
    mutationFn: (p: { id: string; body: Record<string, unknown> }) =>
      aegisFetch(paths.autohealPolicy(orgId!, p.id), { method: "PATCH", body: JSON.stringify(p.body) }),
    onSuccess: () => {
      setErr(null);
      invalidate();
    },
    onError: (e: Error) => setErr(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => aegisFetch(paths.autohealPolicy(orgId!, id), { method: "DELETE" }),
    onSuccess: () => {
      setErr(null);
      invalidate();
    },
    onError: (e: Error) => setErr(e.message),
  });

  const list = policies.data ?? [];
  const live = list.filter((p) => p.enabled && !p.dry_run).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("policyCount")}</p>
          <p className="mt-1 text-2xl font-bold">{list.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("enabledCount")}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{list.filter((p) => p.enabled).length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("liveCount")}</p>
          <p className={`mt-1 text-2xl font-bold ${live > 0 ? "text-amber-400" : ""}`}>{live}</p>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">{t("addPolicy")}</h2>
        {err && <p className="mb-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">{err}</p>}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t("name")}</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="web-down-restart" className="rounded border bg-background px-3 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t("targetContainer")}</span>
            <input value={form.target_container} onChange={(e) => setForm({ ...form, target_container: e.target.value })}
              placeholder="my-web" className="rounded border bg-background px-3 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t("metric")}</span>
            <input value={form.trigger_metric} onChange={(e) => setForm({ ...form, trigger_metric: e.target.value })}
              className="w-36 rounded border bg-background px-3 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t("condition")}</span>
            <select value={form.trigger_operator} onChange={(e) => setForm({ ...form, trigger_operator: e.target.value })}
              className="rounded border bg-background px-2 py-1.5">
              {OPS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t("threshold")}</span>
            <input type="number" value={form.trigger_threshold}
              onChange={(e) => setForm({ ...form, trigger_threshold: Number(e.target.value) })}
              className="w-24 rounded border bg-background px-3 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t("cooldown")}</span>
            <input type="number" value={form.cooldown_seconds}
              onChange={(e) => setForm({ ...form, cooldown_seconds: Number(e.target.value) })}
              className="w-24 rounded border bg-background px-3 py-1.5" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.dry_run} onChange={(e) => setForm({ ...form, dry_run: e.target.checked })} />
            <span>{t("dryRunLabel")}</span>
          </label>
          <button onClick={() => create.mutate()} disabled={!form.name || !form.target_container || create.isPending}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-40">
            {create.isPending ? t("adding") : t("add")}
          </button>
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="p-2 text-left">{t("name")}</th><th className="p-2 text-left">{t("colContainer")}</th>
              <th className="p-2 text-left">{t("colTrigger")}</th><th className="p-2 text-left">{t("colAction")}</th>
              <th className="p-2 text-left">{t("colMode")}</th><th className="p-2 text-left">{t("colEnabled")}</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2 font-medium">{p.name}</td>
                <td className="p-2 font-mono text-xs">{p.target_container}</td>
                <td className="p-2 font-mono text-xs">{p.trigger_metric} {p.trigger_operator} {p.trigger_threshold}</td>
                <td className="p-2">{p.action}</td>
                <td className="p-2">
                  <button
                    onClick={() =>
                      p.dry_run
                        ? setConfirmLive(p)
                        : patch.mutate({ id: p.id, body: { dry_run: true } })
                    }
                    className={`rounded px-2 py-0.5 text-xs ${p.dry_run ? "bg-muted text-muted-foreground" : "bg-amber-500/15 text-amber-400"}`}>
                    {p.dry_run ? t("dryRun") : t("live")}
                  </button>
                </td>
                <td className="p-2">
                  <button onClick={() => patch.mutate({ id: p.id, body: { enabled: !p.enabled } })}
                    className={`rounded px-2 py-0.5 text-xs ${p.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    {p.enabled ? t("statusEnabled") : t("statusDisabled")}
                  </button>
                </td>
                <td className="p-2 text-right">
                  <button onClick={() => setConfirmDelete(p)} className="text-xs text-red-400 hover:underline">{t("delete")}</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">{t("emptyList")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <OConfirmDialog
        open={confirmLive !== null}
        title={t("toggleLiveTitle")}
        description={confirmLive ? t("toggleLiveConfirm", { name: confirmLive.name }) : ""}
        danger
        confirmLabel={t("live")}
        onConfirm={() => {
          if (confirmLive) patch.mutate({ id: confirmLive.id, body: { dry_run: false } });
          setConfirmLive(null);
        }}
        onCancel={() => setConfirmLive(null)}
      />

      <OConfirmDialog
        open={confirmDelete !== null}
        title={t("deleteTitle")}
        description={confirmDelete ? t("deleteConfirm", { name: confirmDelete.name }) : ""}
        danger
        confirmLabel={t("delete")}
        onConfirm={() => {
          if (confirmDelete) remove.mutate(confirmDelete.id);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
