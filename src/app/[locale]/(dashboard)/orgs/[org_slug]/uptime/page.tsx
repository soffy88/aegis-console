"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

interface UptimeTarget {
  id: string;
  name: string;
  url: string;
  interval_seconds: number;
  expected_status: number;
  enabled: boolean;
  last_up: boolean | null;
  last_latency_ms: number | null;
  last_checked_at: string | null;
  last_error: string | null;
  last_tls_days_remaining: number | null;
}

export default function UptimePage() {
  const t = useTranslations("uptime");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", url: "", interval_seconds: 60, expected_status: 200 });
  const [err, setErr] = useState<string | null>(null);

  const targets = useQuery<UptimeTarget[]>({
    queryKey: ["uptime-targets", orgId],
    queryFn: () => aegisFetch<UptimeTarget[]>(paths.uptimeTargets(orgId!)),
    enabled: !!orgId,
    refetchInterval: 15000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["uptime-targets", orgId] });

  const create = useMutation({
    mutationFn: () =>
      aegisFetch(paths.uptimeTargets(orgId!), { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      setForm({ name: "", url: "", interval_seconds: 60, expected_status: 200 });
      setErr(null);
      invalidate();
    },
    onError: (e: Error) => setErr(e.message),
  });

  const toggle = useMutation({
    mutationFn: (target: UptimeTarget) =>
      aegisFetch(paths.uptimeTarget(orgId!, target.id), {
        method: "PATCH",
        body: JSON.stringify({ enabled: !target.enabled }),
      }),
    onSuccess: () => {
      setErr(null);
      invalidate();
    },
    onError: (e: Error) => setErr(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => aegisFetch(paths.uptimeTarget(orgId!, id), { method: "DELETE" }),
    onSuccess: () => {
      setErr(null);
      invalidate();
    },
    onError: (e: Error) => setErr(e.message),
  });

  const list = targets.data ?? [];
  const up = list.filter((t) => t.last_up === true).length;
  const down = list.filter((t) => t.last_up === false).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("targets")}</p>
          <p className="mt-1 text-2xl font-bold">{list.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("up")}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{up}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("down")}</p>
          <p className={`mt-1 text-2xl font-bold ${down > 0 ? "text-red-400" : ""}`}>{down}</p>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">{t("addTitle")}</h2>
        {err && <p className="mb-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-destructive">{err}</p>}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t("name")}</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="my-api" className="rounded border bg-background px-3 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t("url")}</span>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://example.com/health" className="w-72 rounded border bg-background px-3 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t("intervalSec")}</span>
            <input type="number" value={form.interval_seconds}
              onChange={(e) => setForm({ ...form, interval_seconds: Number(e.target.value) })}
              className="w-24 rounded border bg-background px-3 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t("expectedStatus")}</span>
            <input type="number" value={form.expected_status}
              onChange={(e) => setForm({ ...form, expected_status: Number(e.target.value) })}
              className="w-24 rounded border bg-background px-3 py-1.5" />
          </label>
          <button onClick={() => create.mutate()} disabled={!form.name || !form.url || create.isPending}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-40">
            {create.isPending ? t("adding") : t("add")}
          </button>
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="p-2 text-left">{t("name")}</th><th className="p-2 text-left">{t("url")}</th>
              <th className="p-2 text-left">{t("colStatus")}</th><th className="p-2 text-left">{t("colLatency")}</th>
              <th className="p-2 text-left">{t("colTls")}</th>
              <th className="p-2 text-left">{t("colInterval")}</th><th className="p-2 text-left">{t("colEnabled")}</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2 font-medium">{row.name}</td>
                <td className="p-2 font-mono text-xs text-muted-foreground">{row.url}</td>
                <td className="p-2">
                  {row.last_up === null ? <span className="text-muted-foreground">—</span>
                    : row.last_up ? <span className="text-emerald-400">{t("up")}</span>
                    : <span className="text-red-400" title={row.last_error ?? ""}>{t("down")}</span>}
                </td>
                <td className="p-2">{row.last_latency_ms != null ? `${row.last_latency_ms} ms` : "—"}</td>
                <td className="p-2">
                  {row.last_tls_days_remaining == null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : row.last_tls_days_remaining <= 14 ? (
                    <span className="text-red-400">{t("days", { n: Math.round(row.last_tls_days_remaining) })}</span>
                  ) : (
                    <span className="text-muted-foreground">{t("days", { n: Math.round(row.last_tls_days_remaining) })}</span>
                  )}
                </td>
                <td className="p-2">{row.interval_seconds}s</td>
                <td className="p-2">
                  <button onClick={() => toggle.mutate(row)}
                    className={`rounded px-2 py-0.5 text-xs ${row.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    {row.enabled ? t("statusEnabled") : t("statusDisabled")}
                  </button>
                </td>
                <td className="p-2 text-right">
                  <button onClick={() => remove.mutate(row.id)} className="text-xs text-red-400 hover:underline">{t("delete")}</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">{t("empty")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
