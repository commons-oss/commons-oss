<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="packages/brand/logo/svg/lockup-horizontal-on-dark.svg">
    <img src="packages/brand/logo/svg/lockup-horizontal.svg" alt="Commons OSS" width="320">
  </picture>
</p>

<p align="center">
  Open-source tools, held in common, for the people who run clubs.
</p>

---

Commons OSS is an open-source toolkit for Vereine, clubs, and associations. Sportvereine, Feuerwehr, Hobbyvereine, nonprofits. DACH-first, globally legible.

The first product is an attendance tracker. Later products: member CRM, dues, events, funding reports.

## Status

Bootstrapping. The brand is locked at v1.0 (2026-04-25). No apps shipped yet.

## What's in this repo

This is a pnpm + Turborepo monorepo.

```
commons-oss/
├── apps/                          # products (none yet)
├── packages/
│   └── brand/                     # @commons-oss/brand — logo, color tokens, typography
├── BRAND.md                       # canonical brand guidelines
├── CLAUDE.md                      # agent handover for brand work
├── CHANGELOG.md
├── LICENSE                        # AGPL-3.0-or-later
└── README.md
```

## Getting started

Requires Node 20+ and pnpm 10+.

```bash
pnpm install
pnpm build
```

## Stack defaults

For new apps in `apps/*`:

- Next.js 16 (App Router, `proxy.ts` pattern)
- Postgres
- [Logto](https://logto.io) for auth (self-hostable, multi-tenant via Logto orgs)
- shadcn/ui + Tailwind CSS
- next-intl (default locale `de`, also `en`)
- Self-hostable via Docker, Vercel-deployable as managed option

## Brand

See [`BRAND.md`](./BRAND.md). The mark, color, and typography are frozen. Use the `@commons-oss/brand` package to consume tokens and assets.

## License

[AGPL-3.0-or-later](./LICENSE).

A commercial license is available for organizations that cannot comply with AGPL terms. Vereine, nonprofits, NGOs, charities, schools, and OSS projects can request the commercial license fee waived.

Contributions require signing a CLA (template TBD).

## Project links

- GitHub org: [github.com/commons-oss](https://github.com/commons-oss)
- This repo: [github.com/commons-oss/commons-oss](https://github.com/commons-oss/commons-oss)
