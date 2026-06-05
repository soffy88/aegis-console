"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
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
      router.replace("/login");
    }
  }, [router, orgs, activeOrgSlug]);

  return null;
}
