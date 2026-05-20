"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AppWindow,
  Globe,
  Home,
  ShieldAlert,
} from "lucide-react";
import { clsx } from "clsx";

const NAV = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/apps", label: "Apps", icon: AppWindow },
  { href: "/domains", label: "Domains", icon: Globe },
  { href: "/events", label: "Events", icon: Activity },
  { href: "/incidents", label: "Incidents", icon: ShieldAlert },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="px-4 py-5 border-b border-slate-800">
        <span className="text-lg font-bold text-indigo-400">⚡ Aegis</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
