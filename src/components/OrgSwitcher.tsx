"use client";

import { useRouter, useParams } from "next/navigation";
import { useOrgStore } from "@/lib/org-context";

/**
 * Org switcher dropdown — lists all orgs the user belongs to.
 * Switches by navigating to /orgs/[slug] (preserves page context).
 */
export function OrgSwitcher() {
  const router = useRouter();
  const params = useParams<{ org_slug?: string }>();
  const orgs = useOrgStore((s) => s.orgs);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);

  const current = params?.org_slug ?? orgs[0]?.slug ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value;
    setActiveOrg(slug);
    router.push(`/orgs/${slug}`);
  }

  if (orgs.length <= 1) {
    return (
      <span className="px-2 py-1 text-sm font-medium opacity-70">
        {current}
      </span>
    );
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      aria-label="Switch organization"
      className="rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {orgs.map((o) => (
        <option key={o.org_id} value={o.slug}>
          {o.slug}
        </option>
      ))}
    </select>
  );
}
