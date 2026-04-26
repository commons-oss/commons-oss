<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="packages/brand/logo/svg/lockup-horizontal-on-dark.svg">
    <img src="packages/brand/logo/svg/lockup-horizontal.svg" alt="Commons OSS" width="320">
  </picture>
</p>

<p align="center">
  Open-source tools, held in common, for the people who run clubs.
</p>

<p align="center">
  <a href="./README.de.md">Deutsch</a>
</p>

---

Commons OSS is an open-source toolkit for clubs, associations, and nonprofits. Sports clubs, fire departments, hobby groups, charities, community organizations. Built for the DACH region first (Germany, Austria, Switzerland), written to work anywhere.

The first product is an attendance tracker. Later products: member directory, dues and invoicing, events, funding reports.

## Status

Bootstrapping. The brand is locked at v1.0 (2026-04-25). No apps shipped yet.

## What's in this repo

A pnpm + Turborepo monorepo.

```
commons-oss/
├── apps/                          # products (none yet)
├── packages/
│   ├── brand/                     # @commons-oss/brand — logo, color tokens, typography
│   ├── config-eslint/             # shared ESLint flat config
│   ├── config-tsconfig/           # shared TS configs
│   └── db/                        # @commons-oss/db — Drizzle schema, RLS, migrations, seeds
├── docker/postgres-init/          # local Postgres role + grant bootstrap
├── docker-compose.yml             # local Postgres (and optional Logto)
├── .env.example                   # local dev env template
├── BRAND.md                       # canonical brand guidelines
├── CLAUDE.md                      # agent handover for brand work
├── CHANGELOG.md
├── LICENSE                        # AGPL-3.0-or-later
└── README.md
```

## Getting started

Requires Node 20+, pnpm 10+, and Docker.

```bash
pnpm install
cp .env.example .env.local
docker compose up -d
pnpm db:migrate && pnpm db:seed
```

That gives you a Postgres on `localhost:5433` with two roles
(`commons_admin` BYPASSRLS for migrations + seeds, `commons_app` for app
traffic), the schema applied, system roles seeded, and a UFC
Wettmannstätten dogfood tenant (including one Spielgemeinschaft with FC
Eibiswald) ready to play with.

Tenant isolation is enforced at the database via Row-Level Security.
Application code never queries the DB directly — it goes through
`withTenant(ctx, fn)` from `@commons-oss/db`, which sets a transaction-local
GUC the RLS policies read. A missed `withTenant` returns zero rows, not
another tenant's rows.

To start Logto locally as well:

```bash
docker compose --profile logto up -d
```

Other useful scripts:

```bash
pnpm db:generate   # generate a new SQL migration after schema changes
pnpm db:push       # fast schema sync for iteration (TTY required)
pnpm db:reset      # drop + recreate the public schema (localhost only)
pnpm test          # run all tests, including the RLS smoke test
```

## Stack defaults

For new apps in `apps/*`:

- Next.js 16 (App Router, `proxy.ts` pattern)
- Postgres
- [Logto](https://logto.io) for auth (self-hostable, multi-tenant via Logto organizations)
- shadcn/ui + Tailwind CSS
- next-intl (default locale `de`, also `en`)
- Self-hostable via Docker, Vercel-deployable as a managed option

## Brand

See [`BRAND.md`](./BRAND.md). The mark, color, and typography are frozen. Use the `@commons-oss/brand` package to consume tokens and assets.

## License

[AGPL-3.0-or-later](./LICENSE).

A commercial license is available for organizations that cannot comply with AGPL terms. Clubs, nonprofits, NGOs, charities, schools, and other open-source projects can request the commercial license fee be waived.

Contributions require signing a CLA (template TBD).

## Project links

- GitHub org: [github.com/commons-oss](https://github.com/commons-oss)
- This repo: [github.com/commons-oss/commons-oss](https://github.com/commons-oss/commons-oss)
