# @commons-oss/module

The module contract. Every Commons OSS module — first-party, third-party,
internal — declares itself by calling `defineModule(...)` and exporting the
result as default.

## What this package owns

- The `ModuleDefinition` shape (id, name, version, routes, nav, api, perms, messages)
- `defineModule(def)` — Zod-validates the definition at boot; throws with
  `[<id>] <field>: <message>. Hint: <fix>.`
- `buildRegistry([modules])` — cross-module checks (duplicate ids, duplicate
  nav ids); returns a `ModuleRegistry` the shell uses to render nav, mount
  routes, and check perms.

The contract surface is the public API once `@commons-oss/module` reaches
v1.0 (Phase 5). Pre-v1, it can change without ceremony.

## Canonical module shape

```ts
import { defineModule } from "@commons-oss/module";

export const perms = ["attendance.read", "attendance.record", "attendance.admin"] as const;

export default defineModule({
  id: "attendance",
  name: { de: "Anwesenheit", en: "Attendance" },
  version: "0.1.0",
  perms,
  api: { routes: someHonoRouter },
  messages: { de: { nav: "Anwesenheit" }, en: { nav: "Attendance" } },
  routes: [{ path: "", scope: "team", perms: ["attendance.read"] }],
  nav: [
    {
      id: "attendance",
      label: { de: "Anwesenheit", en: "Attendance" },
      href: ({ orgSlug, teamId }) => `/${orgSlug}/${teamId}/attendance`,
    },
  ],
  auditRedact: ["note"],
});
```

`perms` is declared `as const` at the call site and passed through the
generic — that's what narrows `ctx.hasPerm(p)` so a typo'd permission is a
TypeScript error, not a runtime 403.

## What gets validated

| Check                                 | Failure shape                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| `id` kebab-case                       | `[<id>] id: must be kebab-case ...`                                                |
| `version` semver                      | `[<id>] version: must be semver ...`                                               |
| Each `perms[i]` starts with `<id>.`   | `[<id>] perms[i]: '<p>' must start with '<id>.'. Hint: rename to '<id>.<action>'.` |
| Action segment is kebab-case          | `[<id>] perms[i]: '<p>' fails kebab-case rule ...`                                 |
| Team-scoped routes carry `:teamId`    | `[<id>] routes[i]: scope='team' but path '<p>' has no ':teamId' segment ...`       |
| Route perms are declared in `perms[]` | `[<id>] routes[i].perms[j]: '<p>' is not declared ...`                             |
| Cross-module duplicate ids            | `[registry] duplicate module id '<id>'`                                            |
| Cross-module duplicate nav ids        | `[registry] nav id '<n>' declared by both '<a>' and '<b>'`                         |

Hono prefix collisions are caught at mount time inside `apps/shell` — they
need the actual router instances, not the `ApiSpec` shape.

## Tests

```bash
pnpm test
```

Locks the validation messages above. Renaming an error message means
updating the test on purpose, which is a useful prompt to update the docs
too.
