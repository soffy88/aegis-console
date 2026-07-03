"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type Line = { container: string; timestamp: string | null; message: string };

export default function LogsPage() {
  const t = useTranslations("logs");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  const res = useQuery<{ total: number; lines: Line[] }>({
    queryKey: ["logsSearch", orgId, submitted],
    queryFn: () => aegisFetch(paths.logsSearch(orgId!, submitted)),
    enabled: !!orgId,
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>
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
          placeholder={t("searchPlaceholder")}
          className="flex-1 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)]"
        >
          {t("search")}
        </button>
      </form>

      {res.isLoading && <p className="text-sm text-[var(--muted-foreground)]">{t("loading")}</p>}
      {res.data && (
        <p className="text-xs text-[var(--muted-foreground)]">{t("count", { n: res.data.total })}</p>
      )}
      <div className="max-h-[65vh] overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] p-2 font-mono text-xs">
        {(res.data?.lines ?? []).map((l, i) => (
          <div key={i} className="flex gap-2 border-b border-[var(--border)]/30 py-0.5">
            <span className="shrink-0 text-[var(--primary)]">{l.container}</span>
            <span className="shrink-0 text-[var(--muted-foreground)]">
              {l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : ""}
            </span>
            <span className="whitespace-pre-wrap break-all">{l.message}</span>
          </div>
        ))}
        {res.data && res.data.lines.length === 0 && (
          <p className="p-2 text-[var(--muted-foreground)]">{t("empty")}</p>
        )}
      </div>
    </div>
  );
}
