"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useOrgStore } from "@/lib/org-context";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import type { Project } from "@/types/aegis";

/**
 * Project switcher dropdown — lists all projects in the active org.
 * Switches by navigating to /orgs/[org_slug]/projects/[project_slug].
 */
export function ProjectSwitcher() {
  const router = useRouter();
  const params = useParams<{ org_slug?: string; project_slug?: string }>();
  const orgSlug = params?.org_slug ?? "";
  const currentSlug = params?.project_slug ?? "";

  const orgs = useOrgStore((s) => s.orgs);
  const activeOrg = orgs.find((o) => o.slug === orgSlug);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects", activeOrg?.org_id],
    queryFn: () =>
      aegisFetch<Project[]>(paths.projects(activeOrg!.org_id)),
    enabled: !!activeOrg?.org_id,
    staleTime: 60_000,
  });

  if (!projects || projects.length <= 1) {
    return currentSlug ? (
      <span className="px-2 py-1 text-sm opacity-70">{currentSlug}</span>
    ) : null;
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/orgs/${orgSlug}/projects/${e.target.value}`);
  }

  return (
    <select
      value={currentSlug}
      onChange={handleChange}
      aria-label="Switch project"
      className="rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="">— select project —</option>
      {projects.map((p) => (
        <option key={p.id} value={p.slug}>
          {p.display_name}
        </option>
      ))}
    </select>
  );
}
