/**
 * Tests for org context store.
 * Verifies setOrgs derives activeOrgRole correctly.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useOrgStore } from "@/lib/org-context";

const ORG_A = { org_id: "aaa-111", slug: "alpha", role: "admin" };
const ORG_B = { org_id: "bbb-222", slug: "beta", role: "viewer" };

describe("useOrgStore", () => {
  beforeEach(() => {
    useOrgStore.getState().clearOrgs();
  });

  it("starts with empty state", () => {
    const s = useOrgStore.getState();
    expect(s.orgs).toEqual([]);
    expect(s.activeOrgSlug).toBeNull();
    expect(s.activeOrgRole).toBeNull();
  });

  it("setOrgs populates orgs list", () => {
    useOrgStore.getState().setOrgs([ORG_A, ORG_B]);
    expect(useOrgStore.getState().orgs).toHaveLength(2);
  });

  it("setActiveOrg updates slug and derives role", () => {
    useOrgStore.getState().setOrgs([ORG_A, ORG_B]);
    useOrgStore.getState().setActiveOrg("beta");
    expect(useOrgStore.getState().activeOrgSlug).toBe("beta");
    expect(useOrgStore.getState().activeOrgRole).toBe("viewer");
  });

  it("setOrgs re-derives role when active org is already set", () => {
    useOrgStore.getState().setActiveOrg("alpha");
    useOrgStore.getState().setOrgs([ORG_A]);
    expect(useOrgStore.getState().activeOrgRole).toBe("admin");
  });

  it("setActiveOrg to unknown slug yields null role", () => {
    useOrgStore.getState().setOrgs([ORG_A]);
    useOrgStore.getState().setActiveOrg("nonexistent");
    expect(useOrgStore.getState().activeOrgRole).toBeNull();
  });

  it("clearOrgs resets everything", () => {
    useOrgStore.getState().setOrgs([ORG_A]);
    useOrgStore.getState().setActiveOrg("alpha");
    useOrgStore.getState().clearOrgs();
    const s = useOrgStore.getState();
    expect(s.orgs).toEqual([]);
    expect(s.activeOrgSlug).toBeNull();
    expect(s.activeOrgRole).toBeNull();
  });
});
