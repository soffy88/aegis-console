"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
type F = { container: string; sev: string; check: string; detail: string };
type Res = { scanned: number; summary: Record<string, number>; findings: F[] };
const col = (s: string) => (s === "high" ? "text-red-400" : s === "medium" ? "text-yellow-500" : "text-[var(--muted-foreground)]");
export default function SecurityPage() {
  const t = useTranslations("security");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const q = useQuery<Res>({ queryKey: ["securityPosture", orgId], queryFn: () => aegisFetch(paths.securityPosture(orgId!)), enabled: !!orgId });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>
      {q.data && (
        <div className="flex gap-3 text-sm">
          <span>{t("scanned")}: <b>{q.data.scanned}</b></span>
          <span className="text-red-400">{t("high")}: {q.data.summary.high ?? 0}</span>
          <span className="text-yellow-500">{t("medium")}: {q.data.summary.medium ?? 0}</span>
          <span className="text-[var(--muted-foreground)]">{t("low")}: {q.data.summary.low ?? 0}</span>
        </div>
      )}
      <table className="w-full text-sm">
        <thead><tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
          <th className="p-2">{t("severity")}</th><th className="p-2">{t("container")}</th><th className="p-2">{t("check")}</th><th className="p-2">{t("detail")}</th></tr></thead>
        <tbody>{(q.data?.findings ?? []).map((f, i) => (
          <tr key={i} className="border-b border-[var(--border)]/40">
            <td className={`p-2 font-semibold uppercase ${col(f.sev)}`}>{f.sev}</td>
            <td className="p-2 font-mono text-xs">{f.container}</td>
            <td className="p-2 font-mono text-xs">{f.check}</td>
            <td className="p-2">{f.detail}</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}
