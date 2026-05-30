/**
 * In-memory access token store.
 *
 * Security contract:
 *   ✅ Access token lives ONLY in module memory — never in localStorage/sessionStorage.
 *   ✅ Inaccessible to XSS scripts running in other origins.
 *   ✅ Refresh token lives in httpOnly cookie (set by server) — never touched here.
 *
 * Lifecycle:
 *   - On page load: token is null → auto-refresh runs to acquire a fresh token.
 *   - On logout: clearAccessToken() wipes memory; server revokes refresh cookie.
 */

export interface TokenPayload {
  /** Raw JWT string */
  token: string;
  /** Expiry as Unix timestamp (seconds) */
  expiresAt: number;
}

let _current: TokenPayload | null = null;

/** Store a new access token received from the server. */
export function setAccessToken(payload: TokenPayload): void {
  _current = payload;
}

/** Retrieve the current in-memory access token, or null if not set. */
export function getAccessToken(): TokenPayload | null {
  return _current;
}

/**
 * Returns the raw JWT string if present and not yet expired,
 * otherwise null. Callers should trigger a refresh when null.
 */
export function getValidToken(): string | null {
  if (!_current) return null;
  // Treat token as expired 10 seconds early to avoid clock-skew races.
  if (Date.now() / 1000 >= _current.expiresAt - 10) return null;
  return _current.token;
}

/** Clear the in-memory token (e.g., on logout or hard auth failure). */
export function clearAccessToken(): void {
  _current = null;
}
