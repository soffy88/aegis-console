"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
type G = { service: string; resource: string; event_type: string; severity: string; events: number; last_seen: string };
type Res = { raw_events: number; groups: number; noise_reduction_pct: number; correlated: G[] };
export default function CorrelationPage() {
  const t = useTranslations("correlation");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const q = useQuery<Res>({ queryKey: ["correlation", orgId], queryFn: () => aegisFetch(paths.correlation(orgId!, 1440)), enabled: !!orgId, refetchInterval: 30000 });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>
      {q.data && (
        <div className="flex gap-4 text-sm">
          <span>{t("rawEvents")}: <b>{q.data.raw_events}</b></span>
          <span>{t("groups")}: <b>{q.data.groups}</b></span>
          <span className="text-green-400">{t("noiseReduction")}: <b>{q.data.noise_reduction_pct}%</b></span>
        </div>
      )}
      <table className="w-full text-sm">
        <thead><tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
          <th className="p-2">{t("service")}</th><th className="p-2">{t("resource")}</th><th className="p-2">{t("type")}</th><th className="p-2 text-right">{t("events")}</th><th className="p-2">{t("lastSeen")}</th></tr></thead>
        <tbody>{(q.data?.correlated ?? []).map((g, i) => (
          <tr key={i} className="border-b border-[var(--border)]/40">
            <td className="p-2 font-medium">{g.service}</td><td className="p-2 font-mono text-xs">{g.resource}</td>
            <td className="p-2">{g.event_type}</td><td className="p-2 text-right tabular-nums">{g.events}</td>
            <td className="p-2 text-xs text-[var(--muted-foreground)]">{new Date(g.last_seen).toLocaleString()}</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}
