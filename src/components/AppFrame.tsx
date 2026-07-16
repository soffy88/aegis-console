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
  account: "M6 10V8a6 6 0 0112 0v2M5 10h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1zM12 15v2",
  database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  terminal: "M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM7 9l3 3-3 3M13 15h4",
  firewall: "M12 3l8 3v5c0 4.5-3 8-8 10-5-2-8-5.5-8-10V6l8-3zM9 8h6M9 12h6M9 16h6",
  apm: "M3 3v18h18M7 15l3-4 3 2 4-6",
  serviceMap: "M6 6a2 2 0 100-.01M18 6a2 2 0 100-.01M12 19a2 2 0 100-.01M7 7l4 10M17 7l-4 10",
  slo: "M12 3a9 9 0 109 9h-9V3z M12 3v9l6.4 6.4",
  memory: "M4 7h16v10H4V7zm3 0v10m5-10v10m5-10v10M2 9v6m20-6v6",
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
      label: "section.deploy",
      items: [
        { key: "apps", href: `${base}/apps`, icon: "apps" },
        { key: "appInstall", href: `${base}/apps/install`, icon: "appInstall" },
        { key: "store", href: `${base}/store`, icon: "store" },
        { key: "gitDeploy", href: `${base}/git-deploy`, icon: "appInstall" },
        { key: "websites", href: `${base}/websites`, icon: "domains" },
        { key: "projects", href: `${base}/projects`, icon: "projects" },
      ],
    },
    {
      label: "section.infrastructure",
      items: [
        { key: "containers", href: `${base}/containers`, icon: "containers" },
        { key: "images", href: `${base}/images`, icon: "images" },
        { key: "networks", href: `${base}/networks`, icon: "networks" },
        { key: "volumes", href: `${base}/volumes`, icon: "volumes" },
        { key: "nodes", href: `${base}/nodes`, icon: "nodes" },
        { key: "kubernetes", href: `${base}/kubernetes`, icon: "nodes" },
        { key: "files", href: `${base}/files`, icon: "files" },
        { key: "metrics", href: `${base}/metrics`, icon: "metrics" },
        { key: "memory", href: `${base}/memory`, icon: "memory" },
        { key: "uptime", href: `${base}/uptime`, icon: "metrics" },
        { key: "domains", href: `${base}/domains`, icon: "domains" },
        { key: "certificates", href: `${base}/certificates`, icon: "account" },
        { key: "hostTerminal", href: `${base}/host-terminal`, icon: "terminal" },
        { key: "firewall", href: `${base}/firewall`, icon: "firewall" },
      ],
    },
    {
      label: "section.operations",
      items: [
        { key: "events", href: `${base}/events`, icon: "events" },
        { key: "incidents", href: `${base}/incidents`, icon: "incidents" },
        { key: "autoheal", href: `${base}/autoheal`, icon: "autoheal" },
        { key: "autohealPolicies", href: `${base}/autoheal-policies`, icon: "autoheal" },
        { key: "apm", href: `${base}/apm`, icon: "apm" },
        { key: "serviceMap", href: `${base}/service-map`, icon: "serviceMap" },
        { key: "slo", href: `${base}/slo`, icon: "slo" },
        { key: "rum", href: `${base}/rum`, icon: "apm" },
        { key: "profiling", href: `${base}/profiling`, icon: "apm" },
        { key: "brain", href: `${base}/brain`, icon: "brain" },
        { key: "logs", href: `${base}/logs`, icon: "runbooks" },
        { key: "loki", href: `${base}/loki`, icon: "runbooks" },
        { key: "runbooks", href: `${base}/runbooks`, icon: "runbooks" },
        { key: "correlation", href: `${base}/correlation`, icon: "incidents" },
        { key: "security", href: `${base}/security`, icon: "firewall" },
        { key: "statusComponents", href: `${base}/status-components`, icon: "domains" },
      ],
    },
    {
      label: "section.data",
      items: [
        { key: "databases", href: `${base}/databases`, icon: "database" },
        { key: "channels", href: `${base}/channels`, icon: "alertIngest" },
        { key: "webhooks", href: `${base}/webhooks`, icon: "alertIngest" },
        { key: "backups", href: `${base}/backups`, icon: "backups" },
        { key: "alertIngest", href: `${base}/alerts/ingest`, icon: "alertIngest" },
      ],
    },
    {
      label: "section.settings",
      items: [
        { key: "account", href: `${base}/settings/account`, icon: "account" },
        { key: "members", href: `${base}/settings/members`, icon: "account" },
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
                {t(section.label)}
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
