"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useOrgStore } from "@/lib/org-context";

export default function RootPage() {
  const router = useRouter();
  const orgs = useOrgStore((s) => s.orgs);
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const orgsLoaded = useOrgStore((s) => s.orgsLoaded);

  useEffect(() => {
    // Wait for Providers' loadUserOrgs() to resolve before deciding —
    // otherwise this effect can fire before orgs are loaded and bounce
    // an authenticated user to /login.
    if (!orgsLoaded) return;
    const slug = activeOrgSlug ?? orgs[0]?.slug;
    if (slug) {
      router.replace(`/orgs/${slug}`);
    } else {
      router.replace("/login");
    }
  }, [router, orgs, activeOrgSlug, orgsLoaded]);

  return null;
}
