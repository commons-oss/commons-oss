# @commons-oss/shell

The Next.js 16 host that mounts every module. Single deployable.

## What's here

| Path                      | Purpose                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `proxy.ts`                | Next 16 proxy. Auth gate only — public paths pass through, everything else requires a valid session cookie.   |
| `app/api/auth/*`          | Sign-in / callback / sign-out — thin wrappers over `@commons-oss/auth` route handlers.                        |
| `app/api/v1/[[...route]]` | Hono mount point. Phase 1 ships `/health` + `/openapi.json`; modules attach their routers here.               |
| `app/[org]/layout.tsx`    | Tenant shell — verifies session.orgSlug matches the URL slug, renders sidebar from registered modules' `nav`. |
| `app/[org]/page.tsx`      | Phase 1 placeholder dashboard. Demonstrates `withTenant` → RLS-scoped query inside an RSC.                    |
| `modules.ts`              | Static module registry. Add modules here; `buildRegistry` enforces id + nav-id uniqueness.                    |
| `src/ctx.ts`              | `readSession()` + `requireSession(slug)` helpers for RSCs.                                                    |

## Why proxy.ts can't open `withTenant` itself

Next's proxy runs as a separate request lifecycle from the page handler — there's no way to span a Postgres transaction across both. So the proxy verifies the cookie, and each page/handler that hits the DB opens `withTenant({ org: { id: session.orgId } }, fn)` in its own scope.

This is fine because RLS is the floor: even if a page forgets to wrap, the GUC is unset and queries return zero rows. A lint rule (Phase 1.5) will block raw `getDb()` calls outside `packages/db/internal`.

## Slug vs session consistency

`requireSession(slug)` redirects to `/${session.orgSlug}` when the URL slug doesn't match the cookie. RLS would already return zero rows on a mismatch, but the redirect is friendlier than an empty page.

## Dev

```bash
pnpm dev    # http://localhost:3100
```

Sign in via the stub provider (HTML user picker, dev only). NODE*ENV=production refuses the stub and requires `LOGTO*\*` env vars.
