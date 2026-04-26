# Changelog

All notable changes to this monorepo are recorded here. Per-package changes for `@commons-oss/brand` and others may also have their own `CHANGELOG.md`.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `@commons-oss/auth` v0.1 — `AuthProvider` interface with `StubProvider` (dev tenant picker) and `LogtoProvider` scaffold (Phase 1.5 wires `@logto/next`). Mints jose-signed JWT cookies (`HttpOnly`, `SameSite=Lax`, `Secure` in prod) carrying `{ userId, logtoSub, orgId, orgSlug, locale, iat, exp }`. `resolveIdentity` provisions/finds the local user from the external sub claim; `pickActiveOrg` selects the active tenant from membership rows. Route handlers for `/api/auth/{sign-in,callback,sign-out}` mounted by the shell.
- `@commons-oss/module` v0.1 — `defineModule` with Zod-validated contracts (id format, semver, perms scoping, team-scoped routes require `:teamId`) and `buildRegistry` enforcing cross-module uniqueness. Modules declare nav items with locale-aware labels (`{ de, en }`) and an `href` builder that takes the active org slug and optional team id.
- `apps/shell` — Next.js 16 (App Router) admin shell. `proxy.ts` enforces auth; `[org]` segment routes a tenant; the dashboard demonstrates the `session → withTenant → RLS-scoped query` chain end-to-end. Sidebar renders nav from registered modules.
- next-intl 4.9.1 wired into `apps/shell`. Locale resolved per-request from the session cookie (no URL prefix, admin app, locale follows the user). `messages/{de,en}.json` carry `shell` / `auth` / `metadata` namespaces; root layout wraps children in `NextIntlClientProvider`.
- `scripts/check-rls.mjs` — CI guard that scans drizzle migration SQL and fails when any table with an `org_id` column is missing `ENABLE ROW LEVEL SECURITY` or a policy referencing `app.current_org`. Catches the closed-default contract drift Drizzle won't.
- `.github/workflows/ci.yml` — two jobs: `check` (format, lint, type-check, test, RLS guard) and `rls-integration` (Postgres 16 service, provisions `commons_app`, runs reset + migrate + seed:roles + db tests).

- `@commons-oss/db` v0.1 — Drizzle schema for the multi-tenant core: `org`, `external_org`, `team` (with `is_partnership` flag), `partner_team`, `person` (with attribution columns), `team_membership`, `person_guardian`, `user`, `org_member`, `member_role`, `person_user_link`, `role`, `role_permission`, `audit_log`. Domain language is English in code; user-facing labels stay German via `name.de` JSONB columns and i18n catalogs. Spielgemeinschaft (partnership team) is modelled as a first-class case, not an edge case.
- Row-Level Security on every org-scoped table. Two Postgres roles seeded by `docker/postgres-init/00-roles.sql`: `commons_admin` (BYPASSRLS) for migrations + seeds, `commons_app` (RLS-enforced) for app traffic. Policies use `current_setting('app.current_org', true)` so a missed `withTenant` returns zero rows instead of raising.
- `withTenant(ctx, fn)` helper in `@commons-oss/db` — opens a transaction, sets the tenant GUC via `SET LOCAL`, runs `fn` with a tenant-scoped Drizzle handle.
- `@commons-oss/db/internal` subpath export for the unscoped client. Importing it is flagged by the shared ESLint config (`no-restricted-imports`); only auth callbacks, migrations, and seeds may use it.
- RLS smoke test (`packages/db/test/rls.test.ts`) — six tests covering tenant scoping, cross-tenant isolation, sequential GUC isolation, missing-context guard, and rollback semantics.
- `docker-compose.yml` (Postgres 16 on `localhost:5433` to avoid colliding with other local Postgres instances; optional Logto behind `--profile logto`).
- `.env.example` at repo root, `dotenv-cli` wired into `db:*` scripts.
- Root `db:generate`, `db:migrate`, `db:seed`, `db:reset`, `db:push`, `test` scripts.
- Idempotent system-role seed: English keys (`orgadmin`, `officer`, `coach`, `player`, `parent`, `readonly`) with German display names in `name.de` (`Vereinsadmin`, `Funktionär`, `Trainer`, `Spieler`, `Eltern`, `Nur lesen`).
- Dogfood seed: a generic demo org (FC Musterstadt) as the operating tenant, SV Nachbarort as an `external_org` partner, one partnership (U13) team, Max Mustermann as the multi-role example (Reserve player + U15 Cheftrainer + Kassier), Anna Beispiel attributed to SV Nachbarort to exercise the partnership path end-to-end.
- Shared ESLint flat config (`@commons-oss/config-eslint`) and TS configs (`@commons-oss/config-tsconfig`).
- Conventional Commits enforced via commitlint + husky `commit-msg` hook.
- Root `AGENTS.md` (pointer to `CLAUDE.md`).
- `packages/db/README.md` — RLS contract + locking patterns.
- Root `CLAUDE.md` expanded beyond brand: engineering rules, RLS contract, SG model, Next.js 16 / Hono / RHF+Zod3 defaults, commit conventions.

- `@commons-oss/brand` 1.1.0 → 1.2.0: semantic UI status tokens — `ok` (anwesend / present), `warn` (entschuldigt / excused), `bad` (abwesend / absent). Each has light + dark values. Exposed as `status.css` (CSS variables, adapts to `prefers-color-scheme` and `.dark` class) and as `status` export in the JS/TS API. These are UI tokens, not brand tokens, and live alongside the brand tokens without modifying them.

### Changed

- `@commons-oss/brand` 1.0.0 → 1.1.0: widened `OSS` in wordmark (size + letter-spacing) so caps stay legible when General Sans isn't loaded and a system font falls in. SVG lockups updated; PNG wordmark exports regenerated with General Sans Medium installed via `rsvg-convert`. Mark, color, typeface unchanged.

### Added

- Initial monorepo scaffold (pnpm + Turborepo).
- `@commons-oss/brand` v1.0 — logo files, color tokens, typography references.
- Root `BRAND.md` (canonical guidelines, brand locked at v1.0 on 2026-04-25).
- Root `CLAUDE.md` (agent handover for brand work).
- AGPL-3.0-or-later LICENSE.
