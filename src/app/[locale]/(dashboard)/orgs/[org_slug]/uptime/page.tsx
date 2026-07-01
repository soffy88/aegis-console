"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
}

export default function UptimePage() {
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
    mutationFn: (t: UptimeTarget) =>
      aegisFetch(paths.uptimeTarget(orgId!, t.id), {
        method: "PATCH",
        body: JSON.stringify({ enabled: !t.enabled }),
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => aegisFetch(paths.uptimeTarget(orgId!, id), { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const list = targets.data ?? [];
  const up = list.filter((t) => t.last_up === true).length;
  const down = list.filter((t) => t.last_up === false).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">在线探测</h1>
        <p className="text-muted-foreground">HTTP 探测目标 — 结果进 probe_up / probe_latency_ms 指标。</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">目标数</p>
          <p className="mt-1 text-2xl font-bold">{list.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">在线</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{up}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">掉线</p>
          <p className={`mt-1 text-2xl font-bold ${down > 0 ? "text-red-400" : ""}`}>{down}</p>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">添加探测</h2>
        {err && <p className="mb-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">{err}</p>}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">名称</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="my-api" className="rounded border bg-background px-3 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">URL</span>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://example.com/health" className="w-72 rounded border bg-background px-3 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">间隔(秒)</span>
            <input type="number" value={form.interval_seconds}
              onChange={(e) => setForm({ ...form, interval_seconds: Number(e.target.value) })}
              className="w-24 rounded border bg-background px-3 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">期望状态码</span>
            <input type="number" value={form.expected_status}
              onChange={(e) => setForm({ ...form, expected_status: Number(e.target.value) })}
              className="w-24 rounded border bg-background px-3 py-1.5" />
          </label>
          <button onClick={() => create.mutate()} disabled={!form.name || !form.url || create.isPending}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-40">
            {create.isPending ? "添加中…" : "添加"}
          </button>
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="p-2 text-left">名称</th><th className="p-2 text-left">URL</th>
              <th className="p-2 text-left">状态</th><th className="p-2 text-left">延迟</th>
              <th className="p-2 text-left">间隔</th><th className="p-2 text-left">启用</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2 font-medium">{t.name}</td>
                <td className="p-2 font-mono text-xs text-muted-foreground">{t.url}</td>
                <td className="p-2">
                  {t.last_up === null ? <span className="text-muted-foreground">—</span>
                    : t.last_up ? <span className="text-emerald-400">在线</span>
                    : <span className="text-red-400" title={t.last_error ?? ""}>掉线</span>}
                </td>
                <td className="p-2">{t.last_latency_ms != null ? `${t.last_latency_ms} ms` : "—"}</td>
                <td className="p-2">{t.interval_seconds}s</td>
                <td className="p-2">
                  <button onClick={() => toggle.mutate(t)}
                    className={`rounded px-2 py-0.5 text-xs ${t.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    {t.enabled ? "已启用" : "已停用"}
                  </button>
                </td>
                <td className="p-2 text-right">
                  <button onClick={() => remove.mutate(t.id)} className="text-xs text-red-400 hover:underline">删除</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">还没有探测目标</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
