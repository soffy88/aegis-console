/**
 * React hook: check RBAC permission for the active org.
 *
 * Mirrors the server-side PERMISSIONS_BY_ROLE matrix from C1-3 RBAC.
 * The frontend enforces this for UI gating only — the server enforces it
 * authoritatively on every request.
 *
 * Role hierarchy: viewer < operator < member < admin < owner
 */

import { useOrgStore } from "@/lib/org-context";

export type Role = "viewer" | "operator" | "member" | "admin" | "owner";

/** Numeric rank for comparison. Higher = more privileged. */
const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  operator: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

/**
 * Returns true if `role` has at least the privilege level of `minRole`.
 * Used for "can this user do X?" checks in the UI.
 */
export function hasMinRole(role: Role | null | undefined, minRole: Role): boolean {
  if (!role) return false;
  return (ROLE_RANK[role] ?? -1) >= ROLE_RANK[minRole];
}

/**
 * Hook: returns the current user's role in the active org,
 * and convenience helpers for permission checks.
 */
export function usePermission() {
  const role = useOrgStore((s) => s.activeOrgRole) as Role | null;

  return {
    role,
    canView: hasMinRole(role, "viewer"),
    canOperate: hasMinRole(role, "operator"),
    canWrite: hasMinRole(role, "member"),
    canAdmin: hasMinRole(role, "admin"),
    isOwner: hasMinRole(role, "owner"),
  };
}
