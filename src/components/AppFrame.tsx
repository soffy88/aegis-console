"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ODashboardLayout } from "@helios/blocks";
import { OrgSwitcher } from "./OrgSwitcher";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { logout } from "@/lib/auth/client";
import { stopAutoRefresh } from "@/lib/auth/auto-refresh";
import { clearAccessToken } from "@/lib/auth/token-store";
import { useOrgStore } from "@/lib/org-context";

function Sidebar() {
  const pathname = usePathname();
  const params = useParams<{ org_slug?: string; locale?: string }>();
  const orgSlug = params?.org_slug ?? useOrgStore.getState().activeOrgSlug ?? "";
  const t = useTranslations("nav");

  const base = `/orgs/${orgSlug}`;
  const nav = [
    { href: base, label: t("dashboard") },
    { href: `${base}/apps`, label: t("apps") },
    { href: `${base}/apps/install`, label: t("appInstall") },
    { href: `${base}/store`, label: t("store") },
    { href: `${base}/projects`, label: t("projects") },
    { href: `${base}/containers`, label: t("containers") },
    { href: `${base}/events`, label: t("events") },
    { href: `${base}/runbooks`, label: t("runbooks") },
    { href: `${base}/domains`, label: t("domains") },
    { href: `${base}/alerts/ingest`, label: t("alertIngest") },
  ] as const;

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
            pathname.endsWith(href)
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
  const t = useTranslations("nav");

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
      {t("signOut")}
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
      header={
        <header className="flex h-full items-center justify-end px-4">
          <LocaleSwitcher />
          <LogoutButton />
        </header>
      }
      main={<main className="p-6">{children}</main>}
    />
  );
}
