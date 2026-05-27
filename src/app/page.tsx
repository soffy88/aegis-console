"use client";

/**
 * Root redirect — send user to their active org's dashboard.
 * If no org is known yet (orgs not loaded), redirect to /login.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrgStore } from "@/lib/org-context";

export default function RootPage() {
  const router = useRouter();
  const orgs = useOrgStore((s) => s.orgs);
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);

  useEffect(() => {
    const slug = activeOrgSlug ?? orgs[0]?.slug;
    if (slug) {
      router.replace(`/orgs/${slug}`);
    } else {
      // Orgs not loaded yet — middleware will redirect to /login if needed.
      router.replace("/login");
    }
  }, [router, orgs, activeOrgSlug]);

  return null;
}
