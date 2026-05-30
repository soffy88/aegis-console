/**
 * Resolve org_slug → org_id from the in-memory org list.
 * Returns null if the slug isn't found (e.g., before orgs are loaded).
 */

import { useOrgStore } from "@/lib/org-context";

export function useOrgIdBySlug(slug: string | undefined): string | null {
  const orgs = useOrgStore((s) => s.orgs);
  if (!slug) return null;
  return orgs.find((o) => o.slug === slug)?.org_id ?? null;
}
