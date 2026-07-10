import {
  QueryClient,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { ApiError } from "./api";
import { handleAuthFailure } from "./auth/on-auth-failure";
import { notify } from "./toast-bridge";

/** True when an error is (or wraps) an expired-session 401. */
function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function makeQueryClient() {
  return new QueryClient({
    // Global 401 → login redirect: applies to every query and mutation
    // app-wide, so an expired session no longer leaves pages blank.
    queryCache: new QueryCache({
      onError: (error) => {
        if (isAuthError(error)) handleAuthFailure();
      },
    }),
    // Default mutation error surfacing: an expired session redirects; anything
    // else surfaces as a toast — but only when the mutation didn't define its
    // own onError (those already show an inline banner, so skip the toast to
    // avoid double-reporting).
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (isAuthError(error)) {
          handleAuthFailure();
          return;
        }
        if (mutation.options.onError) return;
        notify({
          kind: "error",
          title: "Action failed",
          description: error instanceof Error ? error.message : String(error),
        });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  });
}
