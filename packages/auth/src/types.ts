/**
 * The session payload stored in the cookie. Kept tiny — anything that can
 * be derived from these IDs lives in the database and is fetched per-request.
 */
export interface Session {
  /** `user.id` (uuid). */
  userId: string;
  /** `user.logto_sub` — stable external identity. For the stub provider this
   *  is `stub|<userId>`. */
  logtoSub: string;
  /** Currently active org (tenant). The user can switch tenants from the
   *  shell; we re-mint the cookie when they do. */
  orgId: string;
  /** Org slug — denormalised so proxy.ts doesn't need a DB hop on every
   *  request just to translate `[org]` URL segment → uuid. */
  orgSlug: string;
  /** UI locale. Sourced from `user.default_locale` at sign-in; the user
   *  can flip it from the shell which re-mints the cookie. */
  locale: "de" | "en";
  /** Issued-at and expires-at as unix seconds. */
  iat: number;
  exp: number;
}

/**
 * Output of a provider's `signIn` step — the payload to write to the cookie.
 * The route handler turns this into a Set-Cookie header.
 */
export interface SignInResult {
  session: Session;
  /** Where to redirect after sign-in completes. Defaults to `/${orgSlug}`. */
  redirectTo?: string;
}

export interface AuthProvider {
  /** Stable identifier for diagnostics. */
  readonly kind: "stub" | "logto";

  /**
   * Begin the sign-in flow. For Logto this is a redirect to the OP; for the
   * stub provider it's a server-rendered tenant picker.
   *
   * Receives the Next.js Request. Returns either a Response (redirect or
   * rendered picker) or a SignInResult to be persisted as a cookie.
   */
  beginSignIn(req: Request): Promise<Response>;

  /**
   * Handle the OAuth callback (Logto) or pick-a-tenant POST (stub).
   * Returns the session to persist + final redirect target.
   */
  handleCallback(req: Request): Promise<SignInResult>;

  /**
   * Sign-out. Returns the redirect target (typically `/`) and any
   * provider-specific revocation hooks. The route handler always clears
   * the local cookie regardless.
   */
  signOut(req: Request): Promise<{ redirectTo: string }>;
}
