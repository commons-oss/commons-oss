import { jwtVerify, SignJWT } from 'jose';
import { getConfig } from './config.ts';
import type { Session } from './types.ts';

const ALG = 'HS256';

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getConfig().AUTH_SECRET);
}

/**
 * Mint a signed session JWT. Expiry comes from `session.exp`; we don't add
 * jose's exp claim separately because the caller already computed it.
 */
export async function encodeSession(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(session.iat)
    .setExpirationTime(session.exp)
    .sign(secretKey());
}

/**
 * Verify + decode. Returns null on any failure (bad signature, expired,
 * malformed) so callers don't need to distinguish — they treat any failure
 * as "no session" and redirect to sign-in.
 */
export async function decodeSession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALG] });
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.logtoSub !== 'string' ||
      typeof payload.orgId !== 'string' ||
      typeof payload.orgSlug !== 'string' ||
      (payload.locale !== 'de' && payload.locale !== 'en') ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      logtoSub: payload.logtoSub,
      orgId: payload.orgId,
      orgSlug: payload.orgSlug,
      locale: payload.locale,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Build the `Set-Cookie` header value. Locked attributes per plan §5:
 *   Secure (in production), HttpOnly, SameSite=Lax, Path=/
 * Domain is left unset → cookie is bound to the request host. Override at
 * the deployment edge if you need apex sharing.
 */
export function sessionCookie(token: string, ttlSeconds: number, isProd: boolean): string {
  const parts = [
    `${getConfig().AUTH_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${ttlSeconds}`,
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

export function clearedSessionCookie(isProd: boolean): string {
  const parts = [
    `${getConfig().AUTH_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

/** Read the cookie token from a Request's Cookie header. */
export function readCookieToken(req: Request): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  const name = getConfig().AUTH_COOKIE_NAME;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}
