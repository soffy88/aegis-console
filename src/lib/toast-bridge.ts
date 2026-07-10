/**
 * Toast bridge — lets non-React code (the QueryClient's global QueryCache /
 * MutationCache onError handlers) surface a toast.
 *
 * `useToast()` from @helios/blocks is a hook, so it can only be called inside a
 * component. `ToastBridge` (rendered inside OToastProvider) captures the live
 * dispatcher into this module-level singleton; the query client then calls
 * `notify()` from anywhere. No-ops before the bridge mounts.
 */

import type { ToastKind } from "@helios/blocks";

type ToastFn = (item: {
  kind?: ToastKind;
  title: string;
  description?: string;
  duration?: number;
}) => void;

let _toast: ToastFn | null = null;

/** Registered by <ToastBridge/> once the OToastProvider is mounted. */
export function setToaster(fn: ToastFn | null): void {
  _toast = fn;
}

/** Surface a toast from anywhere. No-op if no provider is mounted yet. */
export function notify(item: {
  kind?: ToastKind;
  title: string;
  description?: string;
  duration?: number;
}): void {
  _toast?.(item);
}
