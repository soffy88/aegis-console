// Installed-app statuses that are still settling. While an app sits in one of
// these, list/detail views poll so the badge flips to running/failed on its own
// instead of looking permanently stuck.
export const TRANSITIONAL_APP_STATUSES = new Set([
  "installing",
  "pending",
  "building",
  "deploying",
  "restarting",
  "pulling",
  "creating",
]);

export function isTransitionalStatus(status: string): boolean {
  return TRANSITIONAL_APP_STATUSES.has(status);
}
