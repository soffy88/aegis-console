"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type SLO = {
  id: string;
  name: string;
  service: string;
  objective: number;
  window_days: number;
  sample_count: number;
  current_sli: number | null;
  budget_remaining_pct: number | null;
  burn_rate: number | null;
  meeting: boolean | null;
};

export default function SloPage() {
  const t = useTranslations("slo");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [objective, setObjective] = useState("99.5");
  const [err, setErr] = useState<string | null>(null);

  const q = useQuery<SLO[]>({
    queryKey: ["slos", orgId],
    queryFn: () => aegisFetch<SLO[]>(paths.slos(orgId!)),
    enabled: !!orgId,
    refetchInterval: 30_000,
  });

  const createM = useMutation({
    mutationFn: () =>
      aegisFetch(paths.slos(orgId!), {
        method: "POST",
        body: JSON.stringify({ name, service, objective: Number(objective), window_days: 30 }),
      }),
    onSuccess: () => {
      setErr(null);
      setName("");
      setService("");
      qc.invalidateQueries({ queryKey: ["slos", orgId] });
    },
    onError: (e: Error) => setErr(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => aegisFetch(paths.slo(orgId!, id), { method: "DELETE" }),
    onSuccess: () => {
      setErr(null);
      qc.invalidateQueries({ queryKey: ["slos", orgId] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const inp = "rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-1.5 text-sm";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--border)] p-3">
        <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">
          {t("name")}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="checkout-avail" className={`${inp} w-40`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">
          {t("service")}
          <input value={service} onChange={(e) => setService(e.target.value)} placeholder="backend" className={`${inp} w-40`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">
          {t("objective")}
          <input value={objective} onChange={(e) => setObjective(e.target.value)} className={`${inp} w-24`} />
        </label>
        <button
          disabled={!name || !service || createM.isPending}
          onClick={() => createM.mutate()}
          className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
        >
          {t("create")}
        </button>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
            <th className="p-2">{t("name")}</th>
            <th className="p-2">{t("service")}</th>
            <th className="p-2 text-right">{t("objective")}</th>
            <th className="p-2 text-right">{t("currentSli")}</th>
            <th className="p-2 text-right">{t("budget")}</th>
            <th className="p-2 text-right">{t("burnRate")}</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {(q.data ?? []).map((s) => (
            <tr key={s.id} className="border-b border-[var(--border)]/40">
              <td className="p-2 font-medium">{s.name}</td>
              <td className="p-2 font-mono text-xs">{s.service}</td>
              <td className="p-2 text-right tabular-nums">{s.objective}%</td>
              <td className={`p-2 text-right tabular-nums ${s.meeting === false ? "text-red-400" : s.meeting ? "text-green-400" : ""}`}>
                {s.current_sli === null ? "—" : `${s.current_sli}%`}
              </td>
              <td className={`p-2 text-right tabular-nums ${(s.budget_remaining_pct ?? 100) < 20 ? "text-red-400" : ""}`}>
                {s.budget_remaining_pct === null ? "—" : `${s.budget_remaining_pct}%`}
              </td>
              <td className={`p-2 text-right tabular-nums ${(s.burn_rate ?? 0) > 1 ? "text-red-400" : ""}`}>
                {s.burn_rate === null ? "—" : `${s.burn_rate}×`}
              </td>
              <td className="p-2 text-right">
                <button onClick={() => delM.mutate(s.id)} className="rounded border border-red-500/30 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10">
                  {t("delete")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-[var(--muted-foreground)]">{t("note")}</p>
    </div>
  );
}
