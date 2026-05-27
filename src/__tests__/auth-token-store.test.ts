/**
 * Tests for in-memory token store.
 * Verifies the security contract: tokens only in memory, proper expiry.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  setAccessToken,
  getAccessToken,
  getValidToken,
  clearAccessToken,
} from "@/lib/auth/token-store";

describe("token-store", () => {
  beforeEach(() => {
    clearAccessToken();
    vi.useRealTimers();
  });

  it("returns null when no token is set", () => {
    expect(getAccessToken()).toBeNull();
    expect(getValidToken()).toBeNull();
  });

  it("stores and retrieves a token payload", () => {
    const payload = { token: "test.jwt.token", expiresAt: Date.now() / 1000 + 3600 };
    setAccessToken(payload);
    expect(getAccessToken()).toEqual(payload);
  });

  it("getValidToken returns token string when not expired", () => {
    const token = "valid.jwt";
    setAccessToken({ token, expiresAt: Date.now() / 1000 + 3600 });
    expect(getValidToken()).toBe(token);
  });

  it("getValidToken returns null when token is expired", () => {
    setAccessToken({ token: "old.jwt", expiresAt: Date.now() / 1000 - 1 });
    expect(getValidToken()).toBeNull();
  });

  it("getValidToken returns null when token expires within 10s (clock-skew buffer)", () => {
    // Expires in 5 seconds — within the 10s buffer.
    setAccessToken({ token: "nearly.expired.jwt", expiresAt: Date.now() / 1000 + 5 });
    expect(getValidToken()).toBeNull();
  });

  it("clearAccessToken wipes the stored token", () => {
    setAccessToken({ token: "tok", expiresAt: Date.now() / 1000 + 3600 });
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
    expect(getValidToken()).toBeNull();
  });

  it("second setAccessToken overwrites the first", () => {
    setAccessToken({ token: "first", expiresAt: Date.now() / 1000 + 3600 });
    setAccessToken({ token: "second", expiresAt: Date.now() / 1000 + 7200 });
    expect(getValidToken()).toBe("second");
  });
});
