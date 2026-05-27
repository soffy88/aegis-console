/**
 * Auth API client — login, logout, and token refresh.
 *
 * All mutations talk to the Aegis backend auth endpoints defined in C1-2.
 * Refresh token is managed by the server via httpOnly cookie; we never
 * read or store it here.
 */

import { clearAccessToken, setAccessToken } from "./token-store";

const API_BASE = process.env["NEXT_PUBLIC_AEGIS_API"] ?? "http://localhost:8080";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds from now
}

/**
 * POST /auth/login — exchange credentials for tokens.
 * Sets the access token in memory; refresh token is set by server cookie.
 */
export async function login(req: LoginRequest): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    credentials: "include", // needed for server to set httpOnly cookie
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { detail?: string }).detail ?? `Login failed: ${res.status}`);
  }

  const data: LoginResponse = await res.json();
  setAccessToken({
    token: data.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
  });
}

/**
 * POST /auth/refresh — use httpOnly refresh cookie to get a new access token.
 * Returns true if a new token was obtained, false if the session has expired.
 */
export async function refreshToken(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include", // sends the httpOnly refresh cookie
  });

  if (!res.ok) {
    clearAccessToken();
    return false;
  }

  const data: LoginResponse = await res.json();
  setAccessToken({
    token: data.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
  });
  return true;
}

/**
 * POST /auth/logout — revoke server-side refresh token + clear local state.
 */
export async function logout(): Promise<void> {
  clearAccessToken();
  // Best-effort: don't block on network failure — user is logged out locally.
  await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}
