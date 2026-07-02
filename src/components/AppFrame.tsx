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

/* ---- inline icon set (no dependency) ---- */
const ICON_PATHS: Record<string, string> = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  apps: "M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z",
  appInstall: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2",
  store: "M3 9l1-5h16l1 5M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M3 9h18M9 13h6",
  projects: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
  containers: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M3 8l9 5 9-5",
  images: "M3 5h18v14H3zM3 9h18M7 5v4",
  networks: "M5 5a2 2 0 100-4 2 2 0 000 4zM19 5a2 2 0 100-4 2 2 0 000 4zM12 23a2 2 0 100-4 2 2 0 000 4zM5 3h14M5 3l7 16M19 3l-7 16",
  volumes: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7",
  nodes: "M4 4h16v6H4V4zm0 10h16v6H4v-6zM7 7h.01M7 17h.01",
  events: "M13 2L3 14h7l-1 8 10-12h-7l1-8z",
  runbooks: "M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5zm0 0v0M8 7h8M8 11h6",
  incidents: "M12 3l9 16H3l9-16zM12 10v4M12 17h.01",
  autoheal: "M20 12a8 8 0 10-3 6.2M20 12V6m0 6h-6",
  brain: "M9 3a3 3 0 00-3 3 3 3 0 00-2 5 3 3 0 002 5 3 3 0 005 2 3 3 0 005-2 3 3 0 002-5 3 3 0 00-2-5 3 3 0 00-3-3 3 3 0 00-3-1 3 3 0 00-3 1zM12 7v10",
  backups: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  domains: "M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9z",
  alertIngest: "M22 6l-10 7L2 6m0 0a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z",
  metrics: "M3 3v18h18M7 14l3-4 3 3 4-6",
  files: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM3 11h18",
};

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-[18px] w-[18px] shrink-0"}
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name] ?? ICON_PATHS.dashboard} />
    </svg>
  );
}

type NavItem = { key: string; href: string; icon: string };
type NavSection = { label: string | null; items: NavItem[] };

function buildNav(base: string): NavSection[] {
  return [
    {
      label: null,
      items: [{ key: "dashboard", href: base, icon: "dashboard" }],
    },
    {
      label: "Deploy",
      items: [
        { key: "apps", href: `${base}/apps`, icon: "apps" },
        { key: "appInstall", href: `${base}/apps/install`, icon: "appInstall" },
        { key: "store", href: `${base}/store`, icon: "store" },
        { key: "gitDeploy", href: `${base}/git-deploy`, icon: "appInstall" },
        { key: "projects", href: `${base}/projects`, icon: "projects" },
      ],
    },
    {
      label: "Infrastructure",
      items: [
        { key: "containers", href: `${base}/containers`, icon: "containers" },
        { key: "images", href: `${base}/images`, icon: "images" },
        { key: "networks", href: `${base}/networks`, icon: "networks" },
        { key: "volumes", href: `${base}/volumes`, icon: "volumes" },
        { key: "nodes", href: `${base}/nodes`, icon: "nodes" },
        { key: "files", href: `${base}/files`, icon: "files" },
        { key: "metrics", href: `${base}/metrics`, icon: "metrics" },
        { key: "uptime", href: `${base}/uptime`, icon: "metrics" },
        { key: "domains", href: `${base}/domains`, icon: "domains" },
      ],
    },
    {
      label: "Operations",
      items: [
        { key: "events", href: `${base}/events`, icon: "events" },
        { key: "incidents", href: `${base}/incidents`, icon: "incidents" },
        { key: "autoheal", href: `${base}/autoheal`, icon: "autoheal" },
        { key: "autohealPolicies", href: `${base}/autoheal-policies`, icon: "autoheal" },
        { key: "brain", href: `${base}/brain`, icon: "brain" },
        { key: "runbooks", href: `${base}/runbooks`, icon: "runbooks" },
      ],
    },
    {
      label: "Data",
      items: [
        { key: "backups", href: `${base}/backups`, icon: "backups" },
        { key: "alertIngest", href: `${base}/alerts/ingest`, icon: "alertIngest" },
      ],
    },
  ];
}

function isActive(pathname: string, href: string, isDashboard: boolean): boolean {
  // pathname carries the /<locale> prefix; href is the locale-less suffix.
  if (isDashboard) return pathname.endsWith(href);
  return pathname.endsWith(href) || pathname.includes(`${href}/`);
}

function Sidebar() {
  const pathname = usePathname();
  const params = useParams<{ org_slug?: string; locale?: string }>();
  const orgSlug = params?.org_slug ?? useOrgStore.getState().activeOrgSlug ?? "";
  const t = useTranslations("nav");
  const base = `/orgs/${orgSlug}`;
  const sections = buildNav(base);

  return (
    <nav className="flex h-full flex-col gap-5 px-3 py-4">
      {/* brand + org */}
      <div className="px-2">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight">Aegis</span>
        </div>
        <OrgSwitcher />
      </div>

      {/* nav sections */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {section.label && (
              <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                {section.label}
              </p>
            )}
            {section.items.map(({ key, href, icon }) => {
              const active = isActive(pathname, href, key === "dashboard");
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[var(--primary-subtle)] font-medium text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--card-foreground)]",
                  ].join(" ")}
                >
                  <Icon
                    name={icon}
                    className={[
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] group-hover:text-[var(--card-foreground)]",
                    ].join(" ")}
                  />
                  <span className="truncate">{t(key)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

function usePageTitle(): string {
  const pathname = usePathname();
  const params = useParams<{ org_slug?: string }>();
  const t = useTranslations("nav");
  const orgSlug = params?.org_slug ?? useOrgStore.getState().activeOrgSlug ?? "";
  const base = `/orgs/${orgSlug}`;
  const flat = buildNav(base).flatMap((s) => s.items);
  // longest matching href wins (so /apps/install beats /apps)
  let best: NavItem | undefined;
  for (const item of flat) {
    if (isActive(pathname, item.href, item.key === "dashboard")) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  return best ? t(best.key) : "Aegis";
}

function HeaderBar() {
  const router = useRouter();
  const clearOrgs = useOrgStore((s) => s.clearOrgs);
  const t = useTranslations("nav");
  const title = usePageTitle();

  async function handleLogout() {
    stopAutoRefresh();
    clearAccessToken();
    clearOrgs();
    await logout();
    router.replace("/login");
  }

  return (
    <header className="flex h-full items-center justify-between border-b border-[var(--border)] px-6">
      <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">
        <LocaleSwitcher />
        <span className="h-4 w-px bg-[var(--border)]" />
        <button
          onClick={() => void handleLogout()}
          className="rounded-md px-3 py-1.5 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)]"
        >
          {t("signOut")}
        </button>
      </div>
    </header>
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <ODashboardLayout
      sidebarCollapsible
      defaultSidebarOpen
      sidebarWidth="248px"
      sidebar={<Sidebar />}
      header={<HeaderBar />}
      main={<main className="mx-auto w-full max-w-[1400px] p-6 sm:p-8">{children}</main>}
    />
  );
}
