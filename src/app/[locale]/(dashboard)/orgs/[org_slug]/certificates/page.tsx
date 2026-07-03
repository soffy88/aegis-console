"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

type Cert = {
  domain: string;
  reachable: boolean;
  issuer?: string;
  not_after?: string;
  days_left?: number;
  expiring_soon?: boolean;
  expired?: boolean;
  error?: string;
};

export default function CertificatesPage() {
  const t = useTranslations("certs");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const q = useQuery<Cert[]>({
    queryKey: ["certificates", orgId],
    queryFn: () => aegisFetch<Cert[]>(paths.certificates(orgId!)),
    enabled: !!orgId,
    refetchInterval: 60_000,
  });

  function badge(c: Cert) {
    if (!c.reachable)
      return <span className="rounded bg-[var(--muted)] px-2 py-0.5 text-xs">{t("unreachable")}</span>;
    if (c.expired)
      return <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs text-red-400">{t("expired")}</span>;
    if (c.expiring_soon)
      return <span className="rounded bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-500">{t("expiringSoon")}</span>;
    return <span className="rounded bg-green-500/15 px-2 py-0.5 text-xs text-green-400">{t("valid")}</span>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <button
          onClick={() => q.refetch()}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--muted)]"
        >
          {t("refresh")}
        </button>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">{t("hint")}</p>

      {q.isLoading && <p className="text-sm text-[var(--muted-foreground)]">{t("loading")}</p>}
      {q.data && q.data.length === 0 && (
        <p className="rounded-md border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
          {t("empty")}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
              <th className="p-2">{t("domain")}</th>
              <th className="p-2">{t("status")}</th>
              <th className="p-2">{t("issuer")}</th>
              <th className="p-2">{t("expires")}</th>
              <th className="p-2">{t("daysLeft")}</th>
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((c) => (
              <tr key={c.domain} className="border-b border-[var(--border)]/50">
                <td className="p-2 font-mono text-xs">{c.domain}</td>
                <td className="p-2">{badge(c)}</td>
                <td className="p-2">{c.issuer || (c.error ? <span className="text-[var(--muted-foreground)]">{c.error}</span> : "—")}</td>
                <td className="p-2 text-xs text-[var(--muted-foreground)]">
                  {c.not_after ? new Date(c.not_after).toLocaleDateString() : "—"}
                </td>
                <td className={`p-2 tabular-nums ${c.expired ? "text-red-400" : c.expiring_soon ? "text-yellow-500" : ""}`}>
                  {typeof c.days_left === "number" ? c.days_left : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
