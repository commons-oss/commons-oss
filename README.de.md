<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="packages/brand/logo/svg/lockup-horizontal-on-dark.svg">
    <img src="packages/brand/logo/svg/lockup-horizontal.svg" alt="Commons OSS" width="320">
  </picture>
</p>

<p align="center">
  Open-Source-Werkzeuge, im Gemeinbesitz, für die Menschen, die Vereine führen.
</p>

<p align="center">
  <a href="./README.md">English</a>
</p>

---

Commons OSS ist ein Open-Source-Toolkit für Vereine, Verbände und gemeinnützige Organisationen. Sportvereine, Feuerwehren, Hobbyvereine, Stiftungen, Bürgerinitiativen. Primär für den DACH-Raum (Deutschland, Österreich, Schweiz) gebaut, weltweit einsetzbar.

Das erste Produkt ist ein Anwesenheits-Tracker. Geplant: Mitgliederverwaltung, Beitragsverwaltung, Eventplanung, Förderungs-Reporting.

## Status

In der Bootstrapping-Phase. Die Brand ist auf v1.0 fixiert (2026-04-25). Noch keine Apps veröffentlicht.

## Inhalt dieses Repos

Ein pnpm + Turborepo Monorepo.

```
commons-oss/
├── apps/                          # Produkte (noch keine)
├── packages/
│   └── brand/                     # @commons-oss/brand — Logo, Farbtokens, Typografie
├── BRAND.md                       # Verbindliche Brand-Guidelines
├── CLAUDE.md                      # Agent-Handover für Brand-Arbeit
├── CHANGELOG.md
├── LICENSE                        # AGPL-3.0-or-later
└── README.md
```

## Erste Schritte

Benötigt Node 20+ und pnpm 10+.

```bash
pnpm install
pnpm build
```

## Stack-Defaults

Für neue Apps in `apps/*`:

- Next.js 16 (App Router, `proxy.ts`-Pattern)
- Postgres
- [Logto](https://logto.io) für Authentifizierung (self-hostbar, mandantenfähig über Logto-Organisationen)
- shadcn/ui + Tailwind CSS
- next-intl (Standard-Locale `de`, zusätzlich `en`)
- Self-hostbar via Docker, optional als Managed-Variante auf Vercel deploybar

## Brand

Siehe [`BRAND.md`](./BRAND.md). Logo, Farbe und Typografie sind fixiert. Tokens und Assets werden über das `@commons-oss/brand`-Package konsumiert.

## Lizenz

[AGPL-3.0-or-later](./LICENSE).

Für Organisationen, die die AGPL-Bedingungen nicht erfüllen können, gibt es eine kommerzielle Lizenz. Vereine, gemeinnützige Organisationen, NGOs, Stiftungen, Schulen und andere Open-Source-Projekte können auf Anfrage von der kommerziellen Lizenzgebühr befreit werden.

Beiträge erfordern die Unterzeichnung eines CLA (Template noch offen).

## Projekt-Links

- GitHub-Organisation: [github.com/commons-oss](https://github.com/commons-oss)
- Dieses Repo: [github.com/commons-oss/commons-oss](https://github.com/commons-oss/commons-oss)
