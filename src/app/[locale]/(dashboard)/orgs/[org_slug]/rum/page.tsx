"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
type P = { app: string; page: string; views: number; p50_ms: number; p95_ms: number };
export default function RumPage() {
  const t = useTranslations("rum");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const q = useQuery<P[]>({ queryKey: ["rum", orgId], queryFn: () => aegisFetch(paths.rumMetrics(orgId!, 1440)), enabled: !!orgId, refetchInterval: 30000 });
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);
  const snippet = `<script>addEventListener('load',()=>{const t=performance.getEntriesByType('navigation')[0];navigator.sendBeacon('${origin}/api/v1/telemetry/${orgId}/rum',JSON.stringify({app:'myapp',page:location.pathname,load_ms:t.loadEventEnd,ttfb_ms:t.responseStart,fcp_ms:t.domContentLoadedEventEnd}))})</script>`;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>
      <details className="rounded-md border border-[var(--border)] p-3 text-xs">
        <summary className="cursor-pointer text-sm">{t("snippet")}</summary>
        <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all font-mono">{snippet}</pre>
      </details>
      {q.data && q.data.length === 0 && <p className="rounded-md border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">{t("empty")}</p>}
      <table className="w-full text-sm">
        <thead><tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
          <th className="p-2">{t("app")}</th><th className="p-2">{t("page")}</th><th className="p-2 text-right">{t("views")}</th><th className="p-2 text-right">p50</th><th className="p-2 text-right">p95</th></tr></thead>
        <tbody>{(q.data ?? []).map((p, i) => (
          <tr key={i} className="border-b border-[var(--border)]/40">
            <td className="p-2">{p.app}</td><td className="p-2 font-mono text-xs">{p.page}</td>
            <td className="p-2 text-right tabular-nums">{p.views}</td>
            <td className="p-2 text-right tabular-nums">{p.p50_ms}ms</td>
            <td className={`p-2 text-right tabular-nums ${p.p95_ms > 3000 ? "text-red-400" : ""}`}>{p.p95_ms}ms</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}
