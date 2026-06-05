import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createMiddleware(routing);

// Anchored checks prevent substring bypass (e.g. /orgs/my-login-app/ matching 'login').
const LOGIN_RE = new RegExp(`^/(${routing.locales.join('|')})/login(/|$)`);

function isPublic(pathname: string): boolean {
  return (
    LOGIN_RE.test(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  );
}

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // Step 1: next-intl locale redirect (no locale → /zh/..., valid locale → pass)
  const intlResponse = handleI18nRouting(req);
  if (intlResponse.status !== 200) return intlResponse;

  // Step 2: auth guard — check refresh_token cookie
  if (!isPublic(pathname) && !req.cookies.has('refresh_token')) {
    // Derive locale from pathname or fall back to default
    const locale = pathname.split('/')[1] ?? 'zh';
    const validLocale = routing.locales.includes(locale as 'zh' | 'en') ? locale : 'zh';
    const url = req.nextUrl.clone();
    url.pathname = `/${validLocale}/login`;
    // Guard against protocol-relative open redirect (//evil.com/...).
    const safeNext = pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/';
    url.searchParams.set('next', safeNext);
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
