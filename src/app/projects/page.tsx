"use client";

/**
 * Legacy /projects route — redirect to org-scoped path.
 * Kept for backwards-compat with any bookmarks.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrgStore } from "@/lib/org-context";

export default function ProjectsRedirectPage() {
  const router = useRouter();
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);

  useEffect(() => {
    if (activeOrgSlug) {
      router.replace(`/orgs/${activeOrgSlug}/projects`);
    } else {
      router.replace("/login");
    }
  }, [router, activeOrgSlug]);

  return null;
}
