# Changelog

All notable changes to this monorepo are recorded here. Per-package changes for `@commons-oss/brand` and others may also have their own `CHANGELOG.md`.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `@commons-oss/db` v0.1 — Drizzle schema for the multi-tenant core: `verein`, `external_verein`, `mannschaft` (with `is_sg` flag), `mannschaft_partner`, `person` (with attribution columns), `mannschaft_membership`, `person_guardian`, `user`, `verein_user`, `verein_user_role`, `person_user_link`, `role`, `role_permission`, `audit_log`. Spielgemeinschaft (SG) is modelled as a first-class case, not an edge case.
- Row-Level Security on every Verein-scoped table. Two Postgres roles seeded by `docker/postgres-init/00-roles.sql`: `commons_admin` (BYPASSRLS) for migrations + seeds, `commons_app` (RLS-enforced) for app traffic. Policies use `current_setting('app.current_verein', true)` so a missed `withTenant` returns zero rows instead of raising.
- `withTenant(ctx, fn)` helper in `@commons-oss/db` — opens a transaction, sets the tenant GUC via `SET LOCAL`, runs `fn` with a tenant-scoped Drizzle handle.
- `@commons-oss/db/internal` subpath export for the unscoped client. Importing it is flagged by the shared ESLint config (`no-restricted-imports`); only auth callbacks, migrations, and seeds may use it.
- RLS smoke test (`packages/db/test/rls.test.ts`) — six tests covering tenant scoping, cross-tenant isolation, sequential GUC isolation, missing-context guard, and rollback semantics.
- `docker-compose.yml` (Postgres 16 on `localhost:5433` to avoid colliding with other local Postgres instances; optional Logto behind `--profile logto`).
- `.env.example` at repo root, `dotenv-cli` wired into `db:*` scripts.
- Root `db:generate`, `db:migrate`, `db:seed`, `db:reset`, `db:push`, `test` scripts.
- Idempotent system-role seed (`vereinsadmin`, `funktionaer`, `trainer`, `spieler`, `eltern`, `readonly`).
- Dogfood seed: a generic demo Verein (FC Musterstadt) as the operating tenant, SV Nachbarort as an `external_verein` partner, one SG (U13) Mannschaft, Max Mustermann as the multi-role example (Reserve player + U15 Cheftrainer + Kassier), Anna Beispiel attributed to SV Nachbarort to exercise the SG path end-to-end.
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
