"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type Line = { stream: string; ts_ns: string; message: string };

export default function LokiPage() {
  const t = useTranslations("loki");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const [q, setQ] = useState('{container="aegis-backend"}');
  const [submitted, setSubmitted] = useState("");

  const status = useQuery<{ configured: boolean; reachable?: boolean; url?: string }>({
    queryKey: ["lokiStatus", orgId],
    queryFn: () => aegisFetch(paths.lokiStatus(orgId!)),
    enabled: !!orgId,
  });
  const res = useQuery<{ total: number; lines: Line[] }>({
    queryKey: ["lokiQuery", orgId, submitted],
    queryFn: () => aegisFetch(paths.lokiQuery(orgId!, submitted)),
    enabled: !!orgId && !!submitted,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {status.data && !status.data.configured ? (
        <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-500">
          {t("notConfigured")}
        </p>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("hint")}{" "}
          {status.data?.url && (
            <span className={status.data.reachable ? "text-green-400" : "text-red-400"}>
              ({status.data.url} · {status.data.reachable ? t("reachable") : t("unreachable")})
            </span>
          )}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q);
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='{container="..."} |= "error"'
          className="flex-1 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 font-mono text-sm"
        />
        <button type="submit" className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)]">
          {t("run")}
        </button>
      </form>

      {res.error && <p className="text-sm text-red-400">{(res.error as Error).message}</p>}
      {res.data && <p className="text-xs text-[var(--muted-foreground)]">{t("count", { n: res.data.total })}</p>}
      <div className="max-h-[62vh] overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] p-2 font-mono text-xs">
        {(res.data?.lines ?? []).map((l, i) => (
          <div key={i} className="flex gap-2 border-b border-[var(--border)]/30 py-0.5">
            <span className="shrink-0 text-[var(--primary)]">{l.stream}</span>
            <span className="whitespace-pre-wrap break-all">{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
