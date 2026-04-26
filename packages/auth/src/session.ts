import { decodeSession, readCookieToken } from "./cookie.ts";
import type { Session } from "./types.ts";

/**
 * Read + verify the session from a Request. Returns null if there is no
 * cookie, the signature is invalid, or the token has expired.
 *
 * Pure — no DB. proxy.ts decides what to do with `null` (redirect to
 * sign-in) and what to do with a valid session (open `withTenant` for
 * the request).
 */
export async function getSession(req: Request): Promise<Session | null> {
  const token = readCookieToken(req);
  if (!token) return null;
  return decodeSession(token);
}
