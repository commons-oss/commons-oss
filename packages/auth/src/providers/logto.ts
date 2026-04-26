import { getConfig, hasLogtoConfig } from "../config.ts";
import { pickActiveOrg, resolveIdentity } from "../provisioning.ts";
import type { AuthProvider, SignInResult } from "../types.ts";

/**
 * Real-Logto provider. Phase 1 SCAFFOLD: the OAuth dance lives behind a
 * clearly-marked TODO until we wire `@logto/next` (Phase 1.5). The
 * provisioning side (`resolveIdentity`) is real and tested via the stub
 * provider's path, so flipping to real Logto only changes how `logtoSub` +
 * `email` are obtained.
 *
 * The provider activates when all three `LOGTO_*` env vars are set; until
 * then, `apps/shell` falls back to the StubProvider with a console.warn.
 */
export class LogtoProvider implements AuthProvider {
  readonly kind = "logto" as const;

  constructor() {
    if (!hasLogtoConfig()) {
      throw new Error(
        "[@commons-oss/auth] LogtoProvider requires LOGTO_ENDPOINT, LOGTO_APP_ID, and LOGTO_APP_SECRET.",
      );
    }
  }

  beginSignIn(_req: Request): Promise<Response> {
    // TODO(Phase 1.5): replace with @logto/next signIn():
    //   - construct authorization URL with state + PKCE
    //   - 302 to Logto's /oidc/auth endpoint
    //   - state cookie set here, verified in handleCallback
    return Promise.reject(notWired("beginSignIn"));
  }

  async handleCallback(req: Request): Promise<SignInResult> {
    // TODO(Phase 1.5): replace with @logto/next handleSignIn():
    //   - verify state, exchange code → tokens, fetch userinfo
    //   - call resolveIdentity({ logtoSub: claims.sub, email: claims.email })
    //   - call pickActiveOrg(memberships, ?org= preference)
    //
    // Below is the shape the wired version returns so the rest of the
    // pipeline (cookie minting, redirect) is already correct.
    const url = new URL(req.url);
    const claims = await fetchClaimsTodo(url);
    const identity = await resolveIdentity({
      logtoSub: claims.sub,
      email: claims.email,
      defaultLocale: "de",
    });
    const active = pickActiveOrg(identity.orgMemberships);
    const cfg = getConfig();
    const now = Math.floor(Date.now() / 1000);
    return {
      session: {
        userId: identity.userId,
        logtoSub: identity.logtoSub,
        orgId: active.orgId,
        orgSlug: active.orgSlug,
        locale: "de",
        iat: now,
        exp: now + cfg.AUTH_SESSION_TTL,
      },
      redirectTo: `/${active.orgSlug}`,
    };
  }

  signOut(_req: Request): Promise<{ redirectTo: string }> {
    // TODO(Phase 1.5): hit Logto's /oidc/session/end with post_logout_redirect_uri.
    return Promise.resolve({ redirectTo: "/" });
  }
}

function notWired(step: string): Error {
  return new Error(
    `[@commons-oss/auth] LogtoProvider.${step} is not yet wired. Phase 1.5 task: integrate @logto/next.`,
  );
}

function fetchClaimsTodo(_url: URL): Promise<{ sub: string; email: string }> {
  // Placeholder so handleCallback's body type-checks. Real impl exchanges
  // the `code` query param for tokens via @logto/next.
  return Promise.reject(notWired("handleCallback"));
}
