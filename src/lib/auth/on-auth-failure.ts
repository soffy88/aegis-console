/**
 * Global 401 handler — invoked from the QueryClient's QueryCache/MutationCache
 * onError when any query or mutation fails with an ApiError(401) (i.e. the
 * access token expired and the silent refresh also failed).
 *
 * Clears all auth/org state and hard-redirects to /login. Runs outside React
 * (in the query client), so it uses window.location rather than a router.
 * Idempotent: guards against redirect storms when many queries 401 at once.
 */

import { clearAccessToken } from "./token-store";
import { stopAutoRefresh } from "./auto-refresh";
import { useOrgStore } from "@/lib/org-context";

let _redirecting = false;

export function handleAuthFailure(): void {
  if (typeof window === "undefined") return;
  // Already on the login page — nothing to redirect.
  if (window.location.pathname.includes("/login")) return;
  if (_redirecting) return;
  _redirecting = true;

  clearAccessToken();
  stopAutoRefresh();
  useOrgStore.getState().clearOrgs();

  // Preserve where the user was so login can send them back.
  const next = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
  window.location.replace(`/login?next=${next}`);
}
