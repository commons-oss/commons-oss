import { clearedSessionCookie, encodeSession, sessionCookie } from "./cookie.ts";
import { getConfig } from "./config.ts";
import { getProvider } from "./provider.ts";

const isProd = process.env.NODE_ENV === "production";

/**
 * Mount these from `apps/shell/app/api/auth/<route>/route.ts`. They wrap the
 * provider's lifecycle and translate to Next's `Response`/`Request` shape.
 *
 *   GET  /api/auth/sign-in   → provider.beginSignIn (Logto: 302 to OP; stub: HTML picker)
 *   POST /api/auth/callback  → provider.handleCallback → set cookie → 302 to /:orgSlug
 *   POST /api/auth/sign-out  → clear cookie → 302 to provider.signOut().redirectTo
 *
 * Logto's OAuth dance is GET /api/auth/callback; the stub provider POSTs the
 * picker form to the same URL. Both are accepted.
 */
export async function handleSignIn(req: Request): Promise<Response> {
  return getProvider().beginSignIn(req);
}

export async function handleCallback(req: Request): Promise<Response> {
  const result = await getProvider().handleCallback(req);
  const cfg = getConfig();
  const token = await encodeSession(result.session);
  const headers = new Headers({
    "Set-Cookie": sessionCookie(token, cfg.AUTH_SESSION_TTL, isProd),
    Location: result.redirectTo ?? `/${result.session.orgSlug}`,
  });
  return new Response(null, { status: 302, headers });
}

export async function handleSignOut(req: Request): Promise<Response> {
  const { redirectTo } = await getProvider().signOut(req);
  const headers = new Headers({
    "Set-Cookie": clearedSessionCookie(isProd),
    Location: redirectTo,
  });
  return new Response(null, { status: 302, headers });
}
