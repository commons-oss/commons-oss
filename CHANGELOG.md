# Changelog

All notable changes to this monorepo are recorded here. Per-package changes for `@commons-oss/brand` and others may also have their own `CHANGELOG.md`.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- `@commons-oss/brand` 1.0.0 → 1.1.0: widened `OSS` in wordmark (size + letter-spacing) so caps stay legible when General Sans isn't loaded and a system font falls in. SVG lockups updated; PNG wordmark exports are now stale and need regeneration from Figma/Affinity with General Sans installed. Mark, color, typeface unchanged.

### Added

- Initial monorepo scaffold (pnpm + Turborepo).
- `@commons-oss/brand` v1.0 — logo files, color tokens, typography references.
- Root `BRAND.md` (canonical guidelines, brand locked at v1.0 on 2026-04-25).
- Root `CLAUDE.md` (agent handover for brand work).
- AGPL-3.0-or-later LICENSE.
