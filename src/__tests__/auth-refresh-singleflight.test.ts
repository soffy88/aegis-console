/**
 * Refresh single-flight: concurrent callers must coalesce onto ONE
 * POST /auth/refresh, because the server rotates+revokes the refresh JTI on
 * every call — parallel refreshes would replay a revoked JTI and 401.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { refreshToken } from "@/lib/auth/client";
import { clearAccessToken, getAccessToken } from "@/lib/auth/token-store";

describe("refreshToken single-flight", () => {
  beforeEach(() => {
    clearAccessToken();
    vi.restoreAllMocks();
  });

  it("coalesces concurrent refreshes into one network call", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        // small async gap so all concurrent callers overlap in-flight
        await new Promise((r) => setTimeout(r, 20));
        return {
          ok: true,
          json: async () => ({ access_token: "tok-A", token_type: "bearer", expires_in: 3600 }),
        } as Response;
      }),
    );

    const results = await Promise.all([
      refreshToken(),
      refreshToken(),
      refreshToken(),
      refreshToken(),
      refreshToken(),
    ]);

    expect(results).toEqual([true, true, true, true, true]);
    expect(calls).toBe(1); // <-- the fix: exactly one /auth/refresh
    expect(getAccessToken()?.token).toBe("tok-A");
  });

  it("allows a fresh refresh after the in-flight one settles", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: "tok-B", token_type: "bearer", expires_in: 3600 }),
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    await refreshToken();
    await refreshToken();

    expect((fetchMock as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(2);
  });
});
