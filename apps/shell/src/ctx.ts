import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession, getConfig, type Session } from '@commons-oss/auth';

/**
 * Read + verify the session inside an RSC / route handler. Returns null if
 * no cookie or invalid — callers redirect to /api/auth/sign-in.
 *
 * Mirrors `getSession(req)` from @commons-oss/auth but reads via Next's
 * `cookies()` API since RSCs don't have a Request handle.
 */
export async function readSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(getConfig().AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSession(token);
}

/**
 * Resolve session + verify the URL tenant slug matches what the session
 * was issued for. A mismatch means the user is trying to access another
 * tenant's URL with their own cookie. We refuse with a redirect to their
 * own home rather than 403, because RLS would return zero rows anyway and
 * a redirect is friendlier.
 *
 * Defense-in-depth: even if this check is bypassed, every page that hits
 * the DB does so through `withTenant({ org: { id: session.orgId } }, ...)`,
 * so RLS remains the floor.
 */
export async function requireSession(slug: string): Promise<Session> {
  const session = await readSession();
  if (!session) redirect('/api/auth/sign-in');
  if (session.orgSlug !== slug) redirect(`/${session.orgSlug}`);
  return session;
}
