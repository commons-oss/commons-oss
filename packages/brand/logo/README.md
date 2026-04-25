# /logo

Brand assets for Commons OSS. See `../BRAND.md` for the full guidelines.

## Which file do I use?

| Context | File |
|---|---|
| Website header, README hero | `svg/lockup-horizontal.svg` |
| Dark-mode header | `svg/lockup-horizontal-on-dark.svg` |
| GitHub org avatar | `png/github-avatar-500.png` |
| Browser favicon | `svg/favicon-32.svg` + `png/favicon.ico` |
| iOS home screen | `png/apple-touch-icon-180.png` |
| App icon, sticker, social avatar | `svg/mark.svg` |
| Square posters, social profile cards | `svg/lockup-vertical.svg` |
| Single-color print (embroidery, t-shirt) | `svg/mark-mono.svg` |
| Slide title in a deck | `svg/lockup-horizontal.svg` |

## Quick install for a Next.js / Astro site

Copy the `png/` and `svg/` files into your `public/` folder, then add to your root layout:

```html
<link rel="icon" type="image/svg+xml" href="/favicon-32.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png" />
<link rel="alternate icon" href="/favicon.ico" />
```

## License

These assets are part of the Commons OSS project and licensed under the same terms as the project. The Commons OSS name and mark may be used without permission to refer to the project. Do not use them to imply endorsement of a derivative or competing product.
