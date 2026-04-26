# @commons-oss/auth

Identity-only auth wrapper. Locks the cookie shape, the session payload,
and the provider abstraction. Real OAuth lives in providers.

## Two providers

| Provider        | When                         | Purpose                                                                                                                            |
| --------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `StubProvider`  | local dev (no `LOGTO_*` env) | List `org_member` rows, click to sign in. Refuses in production.                                                                   |
| `LogtoProvider` | `LOGTO_*` env present        | Real OIDC against [Logto](https://logto.io). Phase 1.5 wires `@logto/next` — currently throws on `beginSignIn` / `handleCallback`. |

`getProvider()` picks one. Production deploys without `LOGTO_*` set throw on
boot — the stub is never silently used in production.

## Cookie contract

Locked attributes:

- `HttpOnly`
- `SameSite=Lax`
- `Path=/`
- `Secure` when `NODE_ENV === 'production'`
- HS256 JWT signed with `AUTH_SECRET` (must be ≥ 32 bytes)

Payload (`Session`):

```ts
{
  (userId, logtoSub, orgId, orgSlug, iat, exp);
}
```

Tiny by design — anything else is fetched per request from the DB.

## Route handlers

Mount from `apps/shell/app/api/auth/<route>/route.ts`:

```ts
import { handleSignIn, handleCallback, handleSignOut } from "@commons-oss/auth/route-handlers";

export const GET = handleSignIn;
// callback: GET for Logto's redirect, POST for the stub picker
export const POST = handleCallback;
```

Routes:

- `GET  /api/auth/sign-in` → provider.beginSignIn
- `GET|POST /api/auth/callback` → provider.handleCallback → set cookie → 302
- `POST /api/auth/sign-out` → clear cookie → 302

## How proxy.ts uses this

```ts
import { getSession } from "@commons-oss/auth";

const session = await getSession(request);
if (!session) return Response.redirect(new URL("/api/auth/sign-in", request.url));
// session.orgId is what pages feed into withTenant for the request
```

## Provisioning

`resolveIdentity({ logtoSub, email })` looks up or creates a `user` row,
then lists active `org_member` memberships. Used by both providers'
callbacks. Throws if the user has zero memberships — Phase 1 has no
self-serve onboarding.

## Tests

```bash
pnpm test
```

Locks the cookie round-trip, tampering, expiry, and prod attributes.
