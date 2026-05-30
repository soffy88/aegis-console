/**
 * Resolve project_slug → project_id from the projects list.
 * Falls back to null while loading or if the slug doesn't exist.
 */

import { useQuery } from "@tanstack/react-query";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import type { Project } from "@/types/aegis";

export function useProjectIdBySlug(
  orgId: string | null,
  projectSlug: string | undefined,
): string | null {
  const { data } = useQuery<Project[]>({
    queryKey: ["projects", orgId],
    queryFn: () => aegisFetch<Project[]>(paths.projects(orgId!)),
    enabled: !!orgId,
    staleTime: 60_000,
  });

  if (!data || !projectSlug) return null;
  return data.find((p) => p.slug === projectSlug)?.id ?? null;
}
