/**
 * Authenticated Aegis API fetch wrapper.
 *
 * Injects the Bearer access token from in-memory store on every request.
 * If the token is missing or expired, attempts a silent refresh before
 * the request. If refresh also fails, throws ApiError(401).
 *
 * API_BASE resolution:
 *   - Browser:  NEXT_PUBLIC_AEGIS_API (public env var, set at build time)
 *   - SSR:      AEGIS_API_INTERNAL_URL (server-only env var, e.g. http://aegis-backend:8000)
 *               Falls back to NEXT_PUBLIC_AEGIS_API if not set.
 *
 * This prevents SSR fetch calls from hitting localhost:8080 inside the
 * Next.js container instead of the actual backend service.
 */

import { getValidToken } from "./auth/token-store";
import { refreshToken } from "./auth/client";

function getApiBase(): string {
  // Server-side: prefer the internal network URL (container-to-container)
  if (typeof window === "undefined") {
    return (
      process.env["AEGIS_API_INTERNAL_URL"] ??
      process.env["NEXT_PUBLIC_AEGIS_API"] ??
      "http://aegis-backend:8000"
    );
  }
  // Client-side: always use the public-facing URL
  return process.env["NEXT_PUBLIC_AEGIS_API"] ?? "http://localhost:8080";
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function aegisFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  // Attempt to get a valid token; if stale, try one silent refresh.
  let token = getValidToken();
  if (!token) {
    const ok = await refreshToken();
    if (!ok) throw new ApiError(401, "Session expired. Please log in again.");
    token = getValidToken();
  }

  const res = await fetch(`${getApiBase()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    credentials: "include", // carry httpOnly cookie for refresh
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

/** Resolve a valid Bearer token, refreshing once if needed. */
async function authHeader(): Promise<Record<string, string>> {
  let token = getValidToken();
  if (!token) {
    const ok = await refreshToken();
    if (!ok) throw new ApiError(401, "Session expired. Please log in again.");
    token = getValidToken();
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Authenticated GET that returns the raw response body as a Blob (for downloads). */
export async function aegisBlob(path: string): Promise<Blob> {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: await authHeader(),
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  return res.blob();
}

/** Authenticated multipart POST (browser sets the Content-Type boundary). */
export async function aegisUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: await authHeader(),
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}
