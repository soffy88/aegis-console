/**
 * Authenticated Aegis API fetch wrapper.
 *
 * Injects the Bearer access token from in-memory store on every request.
 * If the token is missing or expired, attempts a silent refresh before
 * the request. If refresh also fails, throws ApiError(401).
 */

import { getValidToken } from "./auth/token-store";
import { refreshToken } from "./auth/client";

const API_BASE = process.env["NEXT_PUBLIC_AEGIS_API"] ?? "http://localhost:8080";

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

  const res = await fetch(`${API_BASE}${path}`, {
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
