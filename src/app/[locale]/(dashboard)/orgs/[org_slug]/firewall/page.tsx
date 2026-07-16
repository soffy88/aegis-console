"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OConfirmDialog } from "@helios/blocks";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type Status = { backend: string; raw: string; note?: string };

export default function FirewallPage() {
  const t = useTranslations("firewall");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const qc = useQueryClient();
  const [port, setPort] = useState("");
  const [protocol, setProtocol] = useState("tcp");
  const [action, setAction] = useState("allow");
  const [num, setNum] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);

  const status = useQuery<Status>({
    queryKey: ["firewall", orgId],
    queryFn: () => aegisFetch<Status>(paths.firewall(orgId!)),
    enabled: !!orgId,
  });

  const addM = useMutation({
    mutationFn: () =>
      aegisFetch(paths.firewallRules(orgId!), {
        method: "POST",
        body: JSON.stringify({ port: Number(port), protocol, action }),
      }),
    onSuccess: () => {
      setErr(null);
      setPort("");
      qc.invalidateQueries({ queryKey: ["firewall", orgId] });
    },
    onError: (e: Error) => setErr(e.message),
  });
  const delM = useMutation({
    mutationFn: (n: number) => aegisFetch(paths.firewallRule(orgId!, n), { method: "DELETE" }),
    onSuccess: () => {
      setErr(null);
      setNum("");
      qc.invalidateQueries({ queryKey: ["firewall", orgId] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  // Find the rule text for a given number in the raw `ufw status numbered`
  // output (lines look like "[ 1] 22/tcp    ALLOW IN  Anywhere").
  function ruleLine(n: number): string {
    const raw = status.data?.raw ?? "";
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*\[\s*(\d+)\s*\]\s*(.*)$/);
      if (m && Number(m[1]) === n) return (m[2] ?? "").trim();
    }
    return "";
  }

  const inp = "rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-1.5 text-sm";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-500">
        {t("warning")}
      </p>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--border)] p-3">
        <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">
          {t("port")}
          <input value={port} onChange={(e) => setPort(e.target.value)} placeholder="8080" className={`${inp} w-24`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">
          {t("protocol")}
          <select value={protocol} onChange={(e) => setProtocol(e.target.value)} className={inp}>
            <option value="tcp">tcp</option>
            <option value="udp">udp</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">
          {t("action")}
          <select value={action} onChange={(e) => setAction(e.target.value)} className={inp}>
            <option value="allow">allow</option>
            <option value="deny">deny</option>
          </select>
        </label>
        <button
          disabled={!port || addM.isPending}
          onClick={() => addM.mutate()}
          className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
        >
          {t("addRule")}
        </button>
        <span className="mx-2 text-[var(--muted-foreground)]">|</span>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">
          {t("ruleNum")}
          <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="1" className={`${inp} w-20`} />
        </label>
        <button
          disabled={!num || delM.isPending}
          onClick={() => setConfirmDel(Number(num))}
          className="rounded-md border border-red-500/30 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          {t("deleteRule")}
        </button>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      {status.error && <p className="text-sm text-red-400">{(status.error as Error).message}</p>}

      <div>
        <p className="mb-1 text-xs text-[var(--muted-foreground)]">
          {t("backend")}: <b>{status.data?.backend ?? "…"}</b> {status.data?.note ? `— ${status.data.note}` : ""}
        </p>
        <pre className="max-h-[55vh] overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] p-3 font-mono text-xs">
          {status.isLoading ? t("loading") : status.data?.raw || t("empty")}
        </pre>
      </div>

      <OConfirmDialog
        open={confirmDel !== null}
        title={t("deleteRuleTitle")}
        description={
          confirmDel !== null
            ? t("deleteRuleConfirm", { num: confirmDel, rule: ruleLine(confirmDel) || "—" })
            : ""
        }
        danger
        confirmLabel={t("deleteRule")}
        onConfirm={() => {
          if (confirmDel !== null) delM.mutate(confirmDel);
          setConfirmDel(null);
        }}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
