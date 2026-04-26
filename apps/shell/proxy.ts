import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@commons-oss/auth';

/**
 * Next.js 16 proxy. Replaces the older `middleware.ts`. Runs in Node so we
 * can call into `@commons-oss/auth` (which uses jose) without Edge limits.
 *
 * Two jobs only:
 *   1. Public paths (sign-in, callback, health, static) → pass through
 *   2. Everything else → require a valid session cookie; redirect to
 *      sign-in if missing/expired
 *
 * Org-slug-vs-session-orgSlug consistency is enforced inside
 * `[org]/layout.tsx` via `requireSession()` — proxy.ts can't see the
 * route params directly. RLS is the floor: a slug mismatch never returns
 * another tenant's data because the session's orgId drives `withTenant`,
 * and `withTenant` runs inside the page, not here.
 */
export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const session = await getSession(req);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/api/auth/sign-in';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

function isPublicPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/favicon.ico') return true;
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname.startsWith('/api/v1/health')) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/static/')) return true;
  return false;
}

export const config = {
  matcher: [
    // run on every path except Next internals + static files (handled above too,
    // belt-and-braces so we don't accidentally hit DB on every asset)
    '/((?!_next/|static/|.*\\..*).*)',
  ],
};
