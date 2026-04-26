import { z } from "zod";
import type { ModuleDefinition, Permission } from "./types.ts";

const moduleIdSchema = z
  .string()
  .min(2)
  .max(32)
  .regex(/^[a-z][a-z0-9-]*$/, "must be kebab-case starting with a letter");

const actionSchema = z
  .string()
  .min(1)
  .max(48)
  .regex(
    /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/,
    "must be kebab-case (dots allowed for resource segments)",
  );

const semverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(-[\w.]+)?$/, "must be semver (e.g. 1.2.3 or 1.2.3-rc.1)");

const localizedSchema = z.object({
  de: z.string().min(1),
  en: z.string().min(1),
});

const navItemSchema = z.object({
  id: z.string().min(1),
  label: localizedSchema,
  href: z.function(),
  icon: z.string().optional(),
  group: z.enum(["main", "admin"]).optional(),
  order: z.number().int().optional(),
});

const routeSchema = z.object({
  path: z.string(),
  scope: z.enum(["org", "team"]),
  perms: z.array(z.string()).optional(),
});

/**
 * `defineModule` is NOT a passthrough. It runs Zod + invariant checks at
 * boot and throws with `[<moduleId>] <field path>: <message>. Hint: <fix>`
 * so the failure is obvious in dev console + CI logs.
 *
 * What it catches in v1:
 *   - id / version / perm format violations
 *   - perms[] entries that don't start with `<id>.`
 *   - team-scoped route whose path lacks ':teamId'
 *   - i18n key referenced by nav.label.* that's missing from messages
 *
 * Hono prefix collisions and other cross-module checks happen at registry
 * build (see registry.ts) — defineModule only sees one module at a time.
 */
export function defineModule<const TPerms extends readonly Permission[]>(
  def: ModuleDefinition<TPerms[number]> & { perms: TPerms },
): ModuleDefinition<TPerms[number]> {
  const id = parseOrThrow("<root>", moduleIdSchema, def.id, "id");
  const fail = (path: string, message: string, hint: string): never => {
    throw new Error(`[${id}] ${path}: ${message}. Hint: ${hint}.`);
  };

  parseOrThrow(id, semverSchema, def.version, "version");
  parseOrThrow(id, localizedSchema, def.name, "name");
  if (!def.messages?.de || !def.messages?.en) {
    fail(
      "messages",
      "must include both `de` and `en` records",
      "add empty objects if no strings yet",
    );
  }

  def.perms.forEach((p, i) => {
    const prefix = `${id}.`;
    if (!p.startsWith(prefix)) {
      fail(`perms[${i}]`, `'${p}' must start with '${prefix}'`, `rename to '${prefix}<action>'`);
    }
    const action = p.slice(prefix.length);
    const parsed = actionSchema.safeParse(action);
    if (!parsed.success) {
      fail(
        `perms[${i}]`,
        `'${p}' fails kebab-case rule (${parsed.error.issues[0]?.message ?? "invalid"})`,
        `use lowercase letters, digits, hyphens; e.g. '${prefix}record'`,
      );
    }
  });

  def.routes.forEach((r, i) => {
    const parsed = routeSchema.safeParse(r);
    if (!parsed.success) {
      fail(
        `routes[${i}]`,
        parsed.error.issues[0]?.message ?? "invalid",
        "check the RouteSpec shape",
      );
    }
    if (r.scope === "team" && !r.path.includes(":teamId") && r.path !== "") {
      fail(
        `routes[${i}]`,
        `scope='team' but path '${r.path}' has no ':teamId' segment`,
        "change scope to 'org', or move under a parent route that resolves team",
      );
    }
    r.perms?.forEach((p, j) => {
      if (!(def.perms as readonly string[]).includes(p)) {
        fail(
          `routes[${i}].perms[${j}]`,
          `'${p}' is not declared in this module's perms[]`,
          `add '${p}' to perms[] or remove it here`,
        );
      }
    });
  });

  def.nav.forEach((n, i) => {
    const parsed = navItemSchema.safeParse(n);
    if (!parsed.success) {
      fail(`nav[${i}]`, parsed.error.issues[0]?.message ?? "invalid", "check the NavItem shape");
    }
  });

  return def;
}

function parseOrThrow<T>(id: string, schema: z.ZodType<T>, value: unknown, field: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      `[${id}] ${field}: ${issue?.message ?? "invalid"}. Hint: see @commons-oss/module ModuleDefinition type.`,
    );
  }
  return parsed.data;
}
