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

  if (error) return <p className="p-4 text-red-600">Error: {(error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {!isLoading && data?.length === 0 && (
        <p className="text-muted-foreground">{t("noProjects")}</p>
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
