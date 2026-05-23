"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ODashboardLayout } from "@helios/blocks";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/apps", label: "Apps" },
  { href: "/apps/install", label: "Install App" },
  { href: "/store", label: "App Store" },
  { href: "/projects", label: "Projects" },
  { href: "/containers", label: "Containers" },
  { href: "/events", label: "Events" },
  { href: "/domains", label: "Domains" },
  { href: "/alerts/ingest", label: "Alert Ingest" },
] as const;

function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      <p className="mb-3 pl-1 text-xs font-semibold uppercase tracking-wider opacity-50">
        Aegis
      </p>
      {NAV_ITEMS.map(({ href, label }) => (
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

export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <ODashboardLayout
      sidebarCollapsible
      defaultSidebarOpen
      sidebarWidth="240px"
      sidebar={<Sidebar />}
      main={<main className="p-6">{children}</main>}
    />
  );
}
