/**
 * Auto-refresh: silently acquire a new access token before the current one expires.
 *
 * Strategy:
 *   - On app startup (initAuth): try to refresh immediately; if the refresh
 *     cookie is gone the user is not logged in.
 *   - After a successful login: schedule a proactive refresh 60 s before expiry.
 *   - On window focus: check if token is expired and refresh if needed.
 *
 * This file only manages the scheduling. The actual HTTP call is in client.ts.
 */

import { refreshToken } from "./client";
import { getAccessToken, getValidToken } from "./token-store";

let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Cancel any pending scheduled refresh. */
function clearRefreshTimer(): void {
  if (_refreshTimer !== null) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
}

/**
 * Schedule a proactive refresh 60 seconds before the current token expires.
 * Safe to call multiple times — cancels any previous schedule.
 */
export function scheduleRefresh(): void {
  clearRefreshTimer();
  const payload = getAccessToken();
  if (!payload) return;

  const nowSec = Date.now() / 1000;
  const delayMs = Math.max(0, (payload.expiresAt - nowSec - 60) * 1000);

  _refreshTimer = setTimeout(async () => {
    const ok = await refreshToken();
    if (ok) {
      scheduleRefresh(); // reschedule for the new token
    }
    // If not ok, the refresh cookie has expired — user must re-login.
  }, delayMs);
}

/**
 * Called on app startup (e.g., in a top-level Provider or layout).
 * Returns true if the user has an active session, false otherwise.
 */
export async function initAuth(): Promise<boolean> {
  // Fast path: valid token still in memory (e.g., hot reload).
  if (getValidToken()) {
    scheduleRefresh();
    return true;
  }
  // Slow path: no in-memory token, try the refresh cookie.
  const ok = await refreshToken();
  if (ok) {
    scheduleRefresh();
  }
  return ok;
}

/**
 * Stop auto-refresh and clear all state (call on logout).
 */
export function stopAutoRefresh(): void {
  clearRefreshTimer();
}
