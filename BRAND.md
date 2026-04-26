# Commons OSS — brand

Canonical brand guidelines. Drop this file at the repo root or in `docs/`. Update only with intent.

## The mark

The Commons OSS mark is an anchor ring: eight slate dots arranged in a circle around a single forest-green dot at the center.

**What it means.** The eight dots are members. The center is the thing held in common — the data, the club, the resource, the trust. The structure is sober and dependable; the center is human and alive.

**What it does not mean.** It is not a sun, a flower, a compass, a clock face, or a loading spinner. If a designer or contributor proposes a redesign that turns it into any of those, the answer is no.

## The wordmark

`Commons OSS` is set in **General Sans Medium**, title case, with `OSS` slightly smaller than `Commons` and rendered in the muted gray (`#6b7280`).

- Primary typeface: **General Sans Medium** ([fontshare.com/fonts/general-sans](https://www.fontshare.com/fonts/general-sans), free).
- Fallback stack: `'General Sans', 'Söhne', 'Inter', system-ui, sans-serif`.
- The wordmark always uses title case. Never `commons oss`, never `COMMONS OSS`, never `Commons.OSS`.
- `OSS` always uppercase. Never `Oss`, never `oss`.

## Color tokens

| Token         | Hex       | Use                                                               |
| ------------- | --------- | ----------------------------------------------------------------- |
| Slate         | `#1f2937` | Primary text, mark perimeter dots, on-light surfaces              |
| Forest        | `#3f7050` | The anchor dot, accent moments, brand color                       |
| Forest bright | `#4a8a5f` | Favicon and small-size anchor only — improves contrast at 16-32px |
| Mute          | `#6b7280` | `OSS` in the wordmark, secondary text, captions                   |
| Border        | `#e5e7eb` | Hairlines, dividers, card borders                                 |
| Surface       | `#ffffff` | Default light background                                          |
| Surface dark  | `#1f2937` | Default dark background (same as slate)                           |

Do not introduce a fourth brand color without intent. Status colors (success, warning, danger) are UI tokens, not brand tokens.

## Lockup rules

- The horizontal lockup is the default. Use it on landing pages, READMEs, slide titles, and email signatures.
- The vertical lockup is for square contexts — social profile cards, app loading screens, posters.
- The mark alone is for app icons, favicons, GitHub avatars, OG image corners, and any context smaller than 64px.
- Clear space around the lockup is at least one perimeter-dot diameter on every side.
- Never recolor the wordmark (other than to white on dark). Never set the wordmark in another typeface.

## Voice

A few principles, applied to every piece of writing the project ships.

- **Boring, not bro.** "Open-source toolkit for clubs" beats "the future of community infrastructure."
- **Direct, not corporate.** No "we believe," no "passionate about," no "empowering." Say what the tool does.
- **Inclusive of non-developers.** A Feuerwehr treasurer should be able to read the README and understand whether this is for them.
- **Calm authority.** The tool replaces a stressful spreadsheet. The voice should not add stress.
- **DACH-first, globally legible.** German first when writing for users; English for contributors and docs.
- **No em dashes.** A project rule.

## Don'ts

- Don't recolor the perimeter dots. They are slate. Always.
- Don't replace the green anchor with another color to "match" a season, a campaign, or a seasonal repo theme. It is the brand.
- Don't add a tagline inside the lockup. Taglines live next to the lockup, not inside it.
- Don't apply effects: no drop shadows, no gradients, no glows, no 3D, no animation on the mark.
- Don't rotate the mark. The dots are at fixed positions for a reason.
- Don't use the mark as a bullet point or list marker.

## Files in `/logo`

```
logo/
├── svg/                                      # vector source, edit these
│   ├── mark.svg                              # primary mark, full color
│   ├── mark-mono.svg                         # all-slate, single-color print
│   ├── mark-on-dark.svg                      # white perimeter, green anchor
│   ├── lockup-horizontal.svg                 # primary, mark + Commons OSS
│   ├── lockup-horizontal-on-dark.svg
│   ├── lockup-vertical.svg                   # for square contexts
│   ├── favicon-16.svg                        # tuned for 16px rendering
│   └── favicon-32.svg                        # tuned for 32px rendering
└── png/                                      # raster exports, do not hand-edit
    ├── mark-{16,32,64,128,256,512,1024}.png
    ├── mark-on-dark-{128,512}.png
    ├── mark-mono-{128,512}.png
    ├── lockup-horizontal-{480,960,1920}.png
    ├── lockup-horizontal-on-dark-{480,960}.png
    ├── lockup-vertical-{220,440,880}.png
    ├── favicon-{16,32}.png
    ├── favicon.ico                           # multi-res for browsers
    ├── apple-touch-icon-180.png              # iOS home screen
    └── github-avatar-500.png                 # upload as the org avatar
```

## Regenerating PNGs

The PNGs in this repo were generated with cairosvg, which substitutes the system default sans for General Sans. **For production wordmark exports, regenerate from the SVGs in Figma or Affinity with General Sans installed.** The mark-only exports (no text) are correct as-is.

## Web setup

Drop this in your `<head>`:

```html
<link rel="icon" type="image/svg+xml" href="/favicon-32.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png" />
<link rel="alternate icon" href="/favicon.ico" />
```

## CSS variables

For Tailwind v4 / shadcn/ui setups, use these custom properties:

```css
:root {
  --brand-slate: #1f2937;
  --brand-forest: #3f7050;
  --brand-forest-bright: #4a8a5f;
  --brand-mute: #6b7280;
}
```

## Versioning

The brand is at v1.1 as of 2026-04-25. Material changes (new color, new mark, new typography) bump the major version and require a note in `CHANGELOG.md` at the repo root.

### Changes since v1.0

- **v1.1** (2026-04-25) — `OSS` in the wordmark widened (font-size 29→32px horizontal, 22→24px vertical; letter-spacing 0.6→1.8 horizontal, 0.7→1.5 vertical). Restores caps legibility when General Sans is not loaded and a system fallback renders. Mark, color, typeface unchanged.
