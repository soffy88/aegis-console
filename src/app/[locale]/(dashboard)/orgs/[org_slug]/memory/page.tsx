"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OConfirmDialog } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type Host = {
  mem_total_mb?: number;
  mem_used_mb?: number;
  mem_available_mb?: number;
  mem_used_pct?: number;
  swap_total_mb?: number;
  swap_used_mb?: number;
  swap_used_pct?: number;
};
type Row = {
  name: string;
  mem_mb: number;
  limit_mb: number | null;
  pct_of_limit: number | null;
  has_limit: boolean;
};
type Overview = { host: Host; containers: Row[] };

function fmtMb(mb?: number | null): string {
  if (mb == null) return "—";
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GiB` : `${Math.round(mb)} MiB`;
}

function Bar({ pct, warn }: { pct: number; warn: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded bg-[var(--muted)]">
      <div
        className="h-full rounded"
        style={{
          width: `${Math.min(100, pct)}%`,
          background: warn ? "#f87171" : pct > 75 ? "#fbbf24" : "var(--primary)",
        }}
      />
    </div>
  );
}

export default function MemoryPage() {
  const t = useTranslations("memory");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();

  const q = useQuery<Overview>({
    queryKey: ["memoryOverview", orgId],
    queryFn: () => aegisFetch<Overview>(paths.memoryOverview(orgId!)),
    enabled: !!orgId,
    refetchInterval: 15_000,
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [limitMb, setLimitMb] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmSet, setConfirmSet] = useState<{ name: string; memory_mb: number } | null>(null);

  const setM = useMutation({
    mutationFn: (v: { name: string; memory_mb: number }) =>
      aegisFetch(paths.containerLimits(orgId!, v.name), {
        method: "POST",
        body: JSON.stringify({ memory_mb: v.memory_mb }),
      }),
    onSuccess: (_d, v) => {
      setEditing(null);
      setLimitMb("");
      setMsg(`✓ ${v.name}`);
      qc.invalidateQueries({ queryKey: ["memoryOverview", orgId] });
    },
    onError: (e: Error) => setMsg("✗ " + e.message),
  });

  const host = q.data?.host ?? {};
  const rows = q.data?.containers ?? [];
  const noLimit = rows.filter((r) => !r.has_limit).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t("caveat")}</p>
      </div>

      {q.isLoading && <p className="text-sm text-[var(--muted-foreground)]">{tc("loading")}</p>}
      {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}

      {/* host summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-[var(--border)] p-3">
          <div className="text-xs text-[var(--muted-foreground)]">{t("hostMem")}</div>
          <div className="mt-1 text-lg font-semibold">
            {fmtMb(host.mem_used_mb)} / {fmtMb(host.mem_total_mb)}
          </div>
          <div className="mt-2">
            <Bar pct={host.mem_used_pct ?? 0} warn={(host.mem_used_pct ?? 0) > 90} />
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
            {host.mem_used_pct ?? "—"}% · {t("available")} {fmtMb(host.mem_available_mb)}
          </div>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <div className="text-xs text-[var(--muted-foreground)]">{t("hostSwap")}</div>
          <div className="mt-1 text-lg font-semibold">
            {fmtMb(host.swap_used_mb)} / {fmtMb(host.swap_total_mb)}
          </div>
          <div className="mt-2">
            <Bar pct={host.swap_used_pct ?? 0} warn={(host.swap_used_pct ?? 0) > 80} />
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
            {host.swap_used_pct ?? "—"}%
          </div>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <div className="text-xs text-[var(--muted-foreground)]">{t("noLimitCount")}</div>
          <div className="mt-1 text-lg font-semibold">
            {noLimit} / {rows.length}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">{t("noLimitHint")}</div>
        </div>
      </div>

      {msg && (
        <div className={`text-sm ${msg.startsWith("✗") ? "text-destructive" : ""}`}>{msg}</div>
      )}

      {/* container table */}
      <div className="overflow-x-auto rounded-md border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
              <th className="p-2">{t("container")}</th>
              <th className="p-2">{t("usage")}</th>
              <th className="p-2">{t("limit")}</th>
              <th className="p-2 w-40">{t("ofLimit")}</th>
              <th className="p-2 text-right">{t("action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const warn = (r.pct_of_limit ?? 0) >= 90;
              return (
                <tr key={r.name} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-2 font-medium">{r.name}</td>
                  <td className="p-2 tabular-nums">{fmtMb(r.mem_mb)}</td>
                  <td className="p-2">
                    {r.has_limit ? (
                      <span className="tabular-nums">{fmtMb(r.limit_mb)}</span>
                    ) : (
                      <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-xs text-red-400">
                        {t("unlimited")}
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    {r.has_limit && r.pct_of_limit != null ? (
                      <div className="flex items-center gap-2">
                        <Bar pct={r.pct_of_limit} warn={warn} />
                        <span
                          className={`w-12 text-right text-xs tabular-nums ${warn ? "text-red-400" : ""}`}
                        >
                          {r.pct_of_limit}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">—</span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {editing === r.name ? (
                      <span className="inline-flex items-center gap-1">
                        <input
                          autoFocus
                          value={limitMb}
                          onChange={(e) => setLimitMb(e.target.value)}
                          placeholder="MiB"
                          className="w-20 rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 text-xs"
                        />
                        <button
                          disabled={setM.isPending || !limitMb}
                          onClick={() =>
                            setConfirmSet({ name: r.name, memory_mb: parseInt(limitMb, 10) })
                          }
                          className="rounded bg-[var(--primary)] px-2 py-0.5 text-xs text-[var(--primary-foreground)] disabled:opacity-50"
                        >
                          {t("save")}
                        </button>
                        <button
                          onClick={() => {
                            setEditing(null);
                            setLimitMb("");
                          }}
                          className="rounded border border-[var(--border)] px-2 py-0.5 text-xs"
                        >
                          {t("cancel")}
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setEditing(r.name);
                          setLimitMb(r.limit_mb ? String(Math.round(r.limit_mb)) : "");
                          setMsg(null);
                        }}
                        className="rounded border border-[var(--border)] px-2 py-0.5 text-xs hover:bg-[var(--muted)]"
                      >
                        {t("setLimit")}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <OConfirmDialog
        open={confirmSet !== null}
        title={t("setLimitTitle")}
        description={
          confirmSet
            ? t("setLimitConfirm", { name: confirmSet.name, mb: confirmSet.memory_mb })
            : ""
        }
        danger
        confirmLabel={t("save")}
        onConfirm={() => {
          if (confirmSet) setM.mutate(confirmSet);
          setConfirmSet(null);
        }}
        onCancel={() => setConfirmSet(null)}
      />
    </div>
  );
}
