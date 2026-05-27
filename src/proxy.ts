/**
 * Next.js Edge Middleware — auth guard.
 *
 * Security contract:
 *   ✅ Only checks for the presence of the refresh cookie — NO JWT decoding.
 *   ✅ Avoids crypto dependencies in the edge runtime.
 *   ✅ The access token (in-memory) cannot be checked here (edge runs before client JS).
 *
 * Behaviour:
 *   - Public paths (/login, /api, /_next, /favicon) pass through unconditionally.
 *   - All other paths: if no refresh cookie → redirect to /login.
 *   - The client-side auth init (initAuth) does the actual token validation
 *     and will redirect to /login if the refresh cookie is expired/invalid.
 */

import { type NextRequest, NextResponse } from "next/server";

/** Cookie name must match the backend C1-2 config (auth.py). */
const REFRESH_COOKIE = "aegis_refresh";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/",
  "/_next/",
  "/favicon.ico",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const hasRefreshCookie = req.cookies.has(REFRESH_COOKIE);
  if (!hasRefreshCookie) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
