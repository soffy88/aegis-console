import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createMiddleware(routing);

const PUBLIC_SEGMENTS = ['login', '/api/', '/_next/', 'favicon'];

function isPublic(pathname: string): boolean {
  return PUBLIC_SEGMENTS.some((s) => pathname.includes(s));
}

export function middleware(req: NextRequest): NextResponse {
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
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
