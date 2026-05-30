"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ODashboardLayout } from "@helios/blocks";
import { OrgSwitcher } from "./OrgSwitcher";
import { logout } from "@/lib/auth/client";
import { stopAutoRefresh } from "@/lib/auth/auto-refresh";
import { clearAccessToken } from "@/lib/auth/token-store";
import { useOrgStore } from "@/lib/org-context";

function buildNav(orgSlug: string) {
  const base = `/orgs/${orgSlug}`;
  return [
    { href: base, label: "Dashboard" },
    { href: `${base}/apps`, label: "Apps" },
    { href: `${base}/apps/install`, label: "Install App" },
    { href: `${base}/store`, label: "App Store" },
    { href: `${base}/projects`, label: "Projects" },
    { href: `${base}/containers`, label: "Containers" },
    { href: `${base}/events`, label: "Events" },
    { href: `${base}/runbooks`, label: "Runbooks" },
    { href: `${base}/domains`, label: "Domains" },
    { href: `${base}/alerts/ingest`, label: "Alert Ingest" },
  ] as const;
}

function Sidebar() {
  const pathname = usePathname();
  const params = useParams<{ org_slug?: string }>();
  const orgSlug = params?.org_slug ?? useOrgStore.getState().activeOrgSlug ?? "";
  const nav = buildNav(orgSlug);

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      <div className="mb-3 flex items-center gap-2 pl-1">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-50">
          Aegis
        </p>
        <OrgSwitcher />
      </div>
      {nav.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={[
            "rounded px-3 py-2 text-sm transition-colors",
            pathname === href
              ? "bg-primary text-primary-foreground font-medium"
              : "hover:bg-muted",
          ].join(" ")}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function LogoutButton() {
  const router = useRouter();
  const clearOrgs = useOrgStore((s) => s.clearOrgs);

  async function handleLogout() {
    stopAutoRefresh();
    clearAccessToken();
    clearOrgs();
    await logout();
    router.replace("/login");
  }

  return (
    <button
      onClick={() => void handleLogout()}
      className="ml-auto rounded px-3 py-1 text-sm opacity-70 hover:opacity-100 transition-opacity"
    >
      Sign out
    </button>
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <ODashboardLayout
      sidebarCollapsible
      defaultSidebarOpen
      sidebarWidth="240px"
      sidebar={<Sidebar />}
      header={<header className="flex h-full items-center justify-end px-4"><LogoutButton /></header>}
      main={<main className="p-6">{children}</main>}
    />
  );
}
