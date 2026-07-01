"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OKPICard } from "@helios/blocks";
import type { Project } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const { org_slug } = useParams<{ org_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);

  const { data, isLoading, error } = useQuery<Project[]>({
    queryKey: ["projects", orgId],
    queryFn: () => aegisFetch<Project[]>(paths.projects(orgId!)),
    enabled: !!orgId,
    refetchInterval: 30_000,
  });

  if (error)
    return (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
        Error: {(error as Error).message}
      </p>
    );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("statTotal")}</p>
          <p className="mt-1 text-2xl font-bold">{data?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("statProd")}</p>
          <p className="mt-1 text-2xl font-bold text-blue-400">
            {data?.filter((p) => p.environment === "prod").length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">{t("statOther")}</p>
          <p className="mt-1 text-2xl font-bold">
            {data?.filter((p) => p.environment !== "prod").length ?? 0}
          </p>
        </div>
      </div>

      {!isLoading && data?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] py-16 text-center">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          <p className="text-sm text-[var(--muted-foreground)]">{t("noProjects")}</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((p) => (
          <Link key={p.id} href={`/orgs/${org_slug}/projects/${p.slug}`}>
            <OKPICard
              data={{ label: p.display_name, primary: p.environment, indicator: "neutral" }}
              loading={isLoading}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
