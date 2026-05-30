/**
 * Tests for auto-refresh scheduling.
 * Uses fake timers to test refresh timing without real delays.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { scheduleRefresh, stopAutoRefresh } from "@/lib/auth/auto-refresh";
import { setAccessToken, clearAccessToken } from "@/lib/auth/token-store";

// Mock the auth client so we don't make real HTTP calls.
vi.mock("@/lib/auth/client", () => ({
  refreshToken: vi.fn().mockResolvedValue(true),
  login: vi.fn(),
  logout: vi.fn(),
}));

describe("auto-refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks(); // reset call counts between tests
    clearAccessToken();
  });

  afterEach(() => {
    stopAutoRefresh();
    vi.useRealTimers();
  });

  it("scheduleRefresh does nothing when no token is stored", () => {
    // Should not throw.
    expect(() => scheduleRefresh()).not.toThrow();
  });

  it("scheduleRefresh schedules a timeout when token is set", async () => {
    const { refreshToken } = await import("@/lib/auth/client");
    const mockRefresh = vi.mocked(refreshToken);
    mockRefresh.mockResolvedValue(true);

    // Token expires in 120s; refresh should fire at 120s - 60s = 60s.
    setAccessToken({ token: "tok", expiresAt: Date.now() / 1000 + 120 });
    scheduleRefresh();

    // No refresh yet.
    expect(mockRefresh).not.toHaveBeenCalled();

    // Advance to the fire point.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("stopAutoRefresh cancels a pending refresh", async () => {
    const { refreshToken } = await import("@/lib/auth/client");
    const mockRefresh = vi.mocked(refreshToken);
    mockRefresh.mockResolvedValue(true);

    setAccessToken({ token: "tok", expiresAt: Date.now() / 1000 + 120 });
    scheduleRefresh();
    stopAutoRefresh();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("reschedules after a successful refresh", async () => {
    const { refreshToken } = await import("@/lib/auth/client");
    const mockRefresh = vi.mocked(refreshToken);

    // After the first refresh, simulate getting a new token with a far-future
    // expiry so the rescheduled timer doesn't fire within this test.
    mockRefresh.mockImplementation(async () => {
      setAccessToken({ token: "refreshed", expiresAt: Date.now() / 1000 + 3600 });
      return true;
    });

    // Token expires in 65s → first refresh fires at 5s (65 - 60).
    setAccessToken({ token: "tok", expiresAt: Date.now() / 1000 + 65 });
    scheduleRefresh();

    // First fire.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    // Rescheduled timer won't fire for another 3540s — safe to stop here.
  });

  it("does not rethrow if refresh returns false (session expired)", async () => {
    const { refreshToken } = await import("@/lib/auth/client");
    vi.mocked(refreshToken).mockResolvedValue(false);

    setAccessToken({ token: "tok", expiresAt: Date.now() / 1000 + 65 });
    scheduleRefresh();

    await expect(vi.advanceTimersByTimeAsync(5_000)).resolves.not.toThrow();
  });
});
