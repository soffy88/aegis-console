"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { OKPICard, OSparkline } from "@helios/blocks";
import type { Project, ProjectHealth } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";
import { useProjectIdBySlug } from "@/hooks/use-project-id";

export default function ProjectDetailPage() {
  const { org_slug, project_slug } = useParams<{ org_slug: string; project_slug: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const projectId = useProjectIdBySlug(orgId, project_slug);

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["project", orgId, projectId],
    queryFn: () => aegisFetch<Project>(paths.project(orgId!, projectId!)),
    enabled: !!orgId && !!projectId,
  });

  const healthEnabled = !!orgId && !!projectId && !!(project?.config?.health_url);
  const { data: health, isLoading: healthLoading } = useQuery<ProjectHealth>({
    queryKey: ["project-health", orgId, projectId],
    queryFn: () => aegisFetch<ProjectHealth>(paths.projectHealth(orgId!, projectId!)),
    enabled: healthEnabled,
    refetchInterval: 30_000,
  });

  if (isLoading) return <p>Loading…</p>;
  if (!project) return <p className="text-muted-foreground">Project not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{project.display_name}</h1>
        <p className="text-sm text-muted-foreground">{project.slug} · {project.environment}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OKPICard
          data={{ label: "Environment", primary: project.environment, indicator: "neutral" }}
          loading={isLoading}
        />
        {health && (
          <OKPICard
            data={{
              label: "Health",
              primary: health.healthy ? "healthy" : "unhealthy",
              indicator: health.healthy ? "up" : "down",
            }}
            loading={healthLoading}
          />
        )}
        {health?.elapsed_ms != null && (
          <OKPICard
            data={{ label: "Response Time", primary: `${health.elapsed_ms}ms`, indicator: "neutral" }}
            loading={healthLoading}
          />
        )}
      </div>

      {project.config?.health_url != null && (
        <section className="rounded border p-4 space-y-2">
          <h2 className="font-semibold">Health Probe</h2>
          <p className="text-sm text-muted-foreground font-mono">{String(project.config.health_url)}</p>
          {/* TODO: replace hardcoded values with backend history endpoint */}
          <OSparkline
            values={[1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1]}
            indicator={health?.healthy ? "up" : "down"}
            width={120}
            height={32}
            fill
            ariaLabel="health last 24h"
          />
          {health?.error && (
            <p className="text-sm text-destructive">{health.error}</p>
          )}
        </section>
      )}

      <section className="rounded border p-4 space-y-2">
        <h2 className="font-semibold">Configuration</h2>
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
          {JSON.stringify(project.config ?? {}, null, 2)}
        </pre>
      </section>
    </div>
  );
}
