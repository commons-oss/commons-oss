# Commons OSS — brand handover

Context for Claude Code or any agent picking up brand work on this project.

## Project at a glance

**Commons OSS** is an open-source toolkit for Vereine, clubs, and associations (Sportvereine, Feuerwehr, Hobbyvereine, nonprofits). DACH-first, globally legible. First product is an attendance tracker; later: member CRM, dues, events, funding reports.

- **GitHub:** `github.com/commons-oss`
- **Stack:** Next.js 16, Postgres, Logto auth, shadcn/ui, self-hostable, Vercel-deployable
- **License:** AGPL-3.0 + CLA + commercial license (Cal.com / GitLab playbook)
- **Tagline:** Open-source tools, held in common, for the people who run clubs.

## Brand state — locked as of 2026-04-25

The logo, color, and typography are **frozen at v1.0**. Do not redesign without an explicit user instruction to revisit the brand. If a contributor proposes a change, point them to `BRAND.md` and ask them to open an issue describing the problem the change solves.

### What's locked

- **Mark:** Anchor ring — 8 slate dots (`#1f2937`) around a forest-green anchor (`#3f7050`).
- **Wordmark:** `Commons OSS`, General Sans Medium, title case, uppercase OSS in muted gray (`#6b7280`).
- **Favicon variant:** Uses `#4a8a5f` (slightly brighter forest) for the anchor at 16-32px so it doesn't mud-out at small sizes. This is intentional, not a bug.

### Brand colors (canonical)

```
--brand-slate:         #1f2937
--brand-forest:        #3f7050    (the brand color)
--brand-forest-bright: #4a8a5f    (favicons only)
--brand-mute:          #6b7280
```

## When using the brand

1. **Read `BRAND.md` first.** It is the source of truth.
2. **Use SVG by default.** PNG only when SVG is not supported.
3. **General Sans must be loaded** for any rendering of the wordmark. Falls back to Söhne, then Inter, then system sans. The fallback chain is intentional and degrades gracefully.
4. **Do not regenerate PNGs from SVG without General Sans installed** — the wordmark will render in a fallback typeface and look wrong. Mark-only PNGs are safe to regenerate anywhere.
5. **No em dashes** in any project copy. Voice rule.

## When generating new brand-adjacent material

If a user asks for slides, social cards, OG images, README graphics, or a landing page hero, follow these rules in order:

1. Use the locked color tokens. No new colors.
2. Use the lockup, not a remixed version.
3. Default typography: General Sans (display/UI), system mono (code).
4. White background unless the asset is explicitly for a dark context.
5. Generous whitespace. The brand reads as calm, not crowded.
6. No decorative effects: no gradients, no shadows, no glows, no AI-aesthetic imagery.

## Files in this drop

```
commons-oss-brand/
├── BRAND.md                # canonical guidelines, copy this to repo root
├── CLAUDE.md               # this file, copy to repo root or .claude/
└── logo/
    ├── README.md           # quick-reference for which file when
    ├── svg/                # vector source (8 files)
    └── png/                # raster exports (~25 files, multiple sizes)
```

## How to install in the project repo

From the `commons-oss-brand` folder, copy as follows:

```bash
# at repo root of github.com/commons-oss/<project>
cp ../commons-oss-brand/BRAND.md .
cp ../commons-oss-brand/CLAUDE.md .
cp -R ../commons-oss-brand/logo .

# for the Next.js app, also copy favicons into public/
cp logo/png/favicon.ico            apps/web/public/
cp logo/png/favicon-{16,32}.png    apps/web/public/
cp logo/svg/favicon-32.svg         apps/web/public/
cp logo/png/apple-touch-icon-180.png apps/web/public/
```

Then upload `logo/png/github-avatar-500.png` as the GitHub org avatar at `github.com/organizations/commons-oss/settings/profile`.

## Open questions to revisit later

These are deliberately not decided yet — flag them when relevant, don't decide unilaterally:

- **Tagline.** "Open-source tools, held in common, for the people who run clubs" is the working tagline but has not been pressure-tested. May want a shorter version for OG images and slide footers.
- **German name?** Project may want a parallel German tagline for DACH marketing. Not decided.
- **Sub-brands.** When the toolkit grows beyond attendance tracking, the sub-products (CRM, dues, events) need names. Open question whether they get their own marks or just typographic differentiation.
- **Sticker design.** The mark on a 3-inch circle sticker for conferences — needs a proper bleed and possibly a wordmark below. Not yet designed.
