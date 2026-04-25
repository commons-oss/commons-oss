# @commons-oss/brand

Brand assets for Commons OSS: logo files, color tokens, typography references.

The full brand guidelines live in [`BRAND.md`](../../BRAND.md) at the repo root. This package is the consumable form of those assets.

## Install

Inside this monorepo:

```jsonc
// apps/<your-app>/package.json
{
  "dependencies": {
    "@commons-oss/brand": "workspace:*"
  }
}
```

## Use

### CSS variables

```css
@import "@commons-oss/brand/tokens.css";

.button {
  background: var(--brand-forest);
  color: var(--brand-surface);
}
```

### JS / TS tokens

```ts
import { colors, typography, wordmark } from "@commons-oss/brand";

console.log(colors.forest); // "#3f7050"
```

### Logo files

Static assets, referenced by path:

```ts
import markUrl from "@commons-oss/brand/logo/svg/mark.svg";
import lockupUrl from "@commons-oss/brand/logo/svg/lockup-horizontal.svg";
```

Or copy what you need into an app's `public/`:

```bash
cp packages/brand/logo/png/favicon.ico              apps/<app>/public/
cp packages/brand/logo/png/favicon-{16,32}.png      apps/<app>/public/
cp packages/brand/logo/svg/favicon-32.svg           apps/<app>/public/
cp packages/brand/logo/png/apple-touch-icon-180.png apps/<app>/public/
```

For the file picker, see [`logo/README.md`](./logo/README.md).

## Guardrails

Read [`BRAND.md`](../../BRAND.md) before changing anything in this package. The mark, color, and typography are frozen at v1.0. Bump the major version on any material change and note it in [`CHANGELOG.md`](../../CHANGELOG.md).

## License

AGPL-3.0-or-later. The Commons OSS name and mark may be used to refer to the project. Do not use them to imply endorsement of a derivative or competing product.
