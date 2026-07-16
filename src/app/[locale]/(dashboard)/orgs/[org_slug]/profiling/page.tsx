"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
type St = { configured: boolean; url?: string; reachable?: boolean };
export default function ProfilingPage() {
  const t = useTranslations("profiling");
  const tc = useTranslations("common");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const q = useQuery<St>({ queryKey: ["profilingStatus", orgId], queryFn: () => aegisFetch(paths.profilingStatus(orgId!)), enabled: !!orgId });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {q.isLoading && <p className="text-sm text-[var(--muted-foreground)]">{tc("loading")}</p>}
      {q.isError && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}
      {q.data && !q.data.configured ? (
        <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-500">{t("notConfigured")}</p>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="text-[var(--muted-foreground)]">{t("hint")}</p>
          {q.data?.url && (
            <a href={q.data.url} target="_blank" rel="noreferrer" className="inline-block rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)]">
              {t("open")} → {q.data.url}
            </a>
          )}
          <p className={q.data?.reachable ? "text-green-400" : "text-red-400"}>{q.data?.reachable ? t("reachable") : t("unreachable")}</p>
        </div>
      )}
    </div>
  );
}
