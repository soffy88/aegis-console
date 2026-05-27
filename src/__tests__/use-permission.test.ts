/**
 * Tests for usePermission hook and hasMinRole helper.
 * Verifies the role hierarchy matches the C1-3 RBAC matrix.
 */

import { describe, it, expect } from "vitest";
import { hasMinRole } from "@/lib/auth/use-permission";
import type { Role } from "@/lib/auth/use-permission";

describe("hasMinRole", () => {
  const roles: Role[] = ["viewer", "operator", "member", "admin", "owner"];

  it("returns false for null role", () => {
    expect(hasMinRole(null, "viewer")).toBe(false);
  });

  it("returns false for undefined role", () => {
    expect(hasMinRole(undefined, "viewer")).toBe(false);
  });

  it("viewer can view but not operate, write, admin, or own", () => {
    expect(hasMinRole("viewer", "viewer")).toBe(true);
    expect(hasMinRole("viewer", "operator")).toBe(false);
    expect(hasMinRole("viewer", "member")).toBe(false);
    expect(hasMinRole("viewer", "admin")).toBe(false);
    expect(hasMinRole("viewer", "owner")).toBe(false);
  });

  it("operator can view and operate but not write, admin, or own", () => {
    expect(hasMinRole("operator", "viewer")).toBe(true);
    expect(hasMinRole("operator", "operator")).toBe(true);
    expect(hasMinRole("operator", "member")).toBe(false);
    expect(hasMinRole("operator", "admin")).toBe(false);
  });

  it("member can view, operate, and write but not admin or own", () => {
    expect(hasMinRole("member", "viewer")).toBe(true);
    expect(hasMinRole("member", "operator")).toBe(true);
    expect(hasMinRole("member", "member")).toBe(true);
    expect(hasMinRole("member", "admin")).toBe(false);
    expect(hasMinRole("member", "owner")).toBe(false);
  });

  it("admin can do everything except owner-only actions", () => {
    expect(hasMinRole("admin", "viewer")).toBe(true);
    expect(hasMinRole("admin", "operator")).toBe(true);
    expect(hasMinRole("admin", "member")).toBe(true);
    expect(hasMinRole("admin", "admin")).toBe(true);
    expect(hasMinRole("admin", "owner")).toBe(false);
  });

  it("owner passes all checks", () => {
    for (const minRole of roles) {
      expect(hasMinRole("owner", minRole)).toBe(true);
    }
  });

  it("role hierarchy is strictly ordered", () => {
    // Each role should pass its own check and all lower checks.
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i]!;
      for (let j = 0; j < roles.length; j++) {
        const minRole = roles[j]!;
        expect(hasMinRole(role, minRole)).toBe(i >= j);
      }
    }
  });
});
