/**
 * Org context store — active org/project selection.
 *
 * Persisted to sessionStorage so the selection survives page reloads
 * within the same browser session, but not across new tabs.
 *
 * The user's org memberships come from the JWT claims (/auth/me).
 * The active org is derived from the URL slug (orgs/[org_slug]/...).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OrgMembership {
  org_id: string;
  slug: string;
  role: string;
}

export interface OrgState {
  /** Orgs the current user belongs to (populated from /auth/me). */
  orgs: OrgMembership[];
  /** Slug of the currently active org (from URL). */
  activeOrgSlug: string | null;
  /** Role of the user in the active org (derived). */
  activeOrgRole: string | null;
  /** True once loadUserOrgs() has resolved at least once (success or empty). */
  orgsLoaded: boolean;

  setOrgs(orgs: OrgMembership[]): void;
  setActiveOrg(slug: string | null): void;
  clearOrgs(): void;
  setOrgsLoaded(loaded: boolean): void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set, get) => ({
      orgs: [],
      activeOrgSlug: null,
      activeOrgRole: null,
      orgsLoaded: false,

      setOrgs(orgs) {
        const { activeOrgSlug } = get();
        const activeOrg = orgs.find((o) => o.slug === activeOrgSlug);
        set({ orgs, activeOrgRole: activeOrg?.role ?? null, orgsLoaded: true });
      },

      setActiveOrg(slug) {
        const { orgs } = get();
        const activeOrg = orgs.find((o) => o.slug === slug);
        set({ activeOrgSlug: slug, activeOrgRole: activeOrg?.role ?? null });
      },

      clearOrgs() {
        set({ orgs: [], activeOrgSlug: null, activeOrgRole: null });
      },

      setOrgsLoaded(loaded) {
        set({ orgsLoaded: loaded });
      },
    }),
    {
      name: "aegis-org-context",
      storage: {
        getItem: (key) => {
          if (typeof sessionStorage === "undefined") return null;
          const raw = sessionStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        },
        setItem: (key, value) => {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(key, JSON.stringify(value));
          }
        },
        removeItem: (key) => {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem(key);
          }
        },
      },
    },
  ),
);

/**
 * Fetch current user's org memberships and store them.
 * Called after login and on app init.
 */
export async function loadUserOrgs(): Promise<OrgMembership[]> {
  const apiBase =
    typeof window === "undefined"
      ? (process.env["AEGIS_API_INTERNAL_URL"] ??
         process.env["NEXT_PUBLIC_AEGIS_API"] ??
         "http://aegis-backend:8000")
      : (process.env["NEXT_PUBLIC_AEGIS_API"] ?? "http://localhost:8080");
  // Import here to avoid circular dependency with auth/client.ts
  const { getValidToken } = await import("./auth/token-store");
  const token = getValidToken();
  if (!token) return [];

  const res = await fetch(`${apiBase}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];

  const data = await res.json() as { orgs?: OrgMembership[] };
  const orgs: OrgMembership[] = data.orgs ?? [];
  useOrgStore.getState().setOrgs(orgs);
  return orgs;
}
