import type { DrizzleDb } from "@commons-oss/db";

export type ModuleId = string;

/**
 * `<moduleId>.<action>` where action matches /^[a-z][a-z0-9-]*$/ and total
 * length is ≤ 64. Four conventional actions get autocomplete via the union;
 * modules add domain verbs as needed without losing type safety.
 */
export type PermissionAction = "read" | "write" | "manage" | "admin" | (string & {});
export type Permission = `${ModuleId}.${PermissionAction}`;

export type Locale = "de" | "en";

export interface LocalizedString {
  de: string;
  en: string;
}

/**
 * The runtime context every module route + API handler receives. Built by
 * the shell's `getModuleCtx()` helper after auth + tenant resolution have
 * already happened in proxy.ts.
 *
 * `db` is the transactional handle returned from `withTenant` — RLS is
 * already in effect.
 */
export interface ModuleContext<TPerm extends Permission = Permission> {
  db: DrizzleDb;
  user: { id: string; logtoSub: string; locale: Locale };
  org: { id: string; slug: string; name: string };
  /** Present when the route is team-scoped. */
  team?: { id: string; name: string };
  perms: ReadonlySet<TPerm>;
  hasPerm: (p: TPerm) => boolean;
}

/**
 * Which user persona this nav item is for. Shell filters items by the
 * current user's roles before rendering. `'both'` (or omitted) shows for
 * everyone — use this for shared destinations like reports.
 */
export type NavPersona = "coach" | "officer" | "both";

export interface NavItem {
  id: string;
  label: LocalizedString;
  href: (ctx: { orgSlug: string; teamId?: string }) => string;
  /** lucide-react icon name */
  icon?: string;
  group?: "main" | "admin";
  order?: number;
  /** Defaults to `'both'`. */
  persona?: NavPersona;
}

export interface RouteSpec {
  /** Declarative path under `/[org]/(modules)/<id>/`. The codegen step
   * (Phase 1 task #11 — `pnpm gen:routes`) copies the real Next route
   * file from `packages/modules/<id>/src/web/routes/<path>/page.tsx`.
   */
  path: string;
  scope: "org" | "team";
  /** Required perms (any-of). Omit for public-within-tenant routes. */
  perms?: readonly Permission[];
}

/**
 * Hono router shape. Kept as a generic to avoid pulling `@hono/zod-openapi`
 * as a hard dependency of `@commons-oss/module`. The shell mounts the
 * router at `/api/v1/<moduleId>/*`.
 */
export interface ApiSpec {
  routes: unknown;
}

export interface ModuleDefinition<TPerm extends Permission = Permission> {
  id: ModuleId;
  name: LocalizedString;
  /** semver of this module package */
  version: string;
  routes: RouteSpec[];
  nav: NavItem[];
  /** REQUIRED. Every module exposes a Hono router (may be empty). */
  api: ApiSpec;
  /** Re-export of drizzle schema for type composition. Optional in v1. */
  schema?: Record<string, unknown>;
  messages: { de: Record<string, string>; en: Record<string, string> };
  /** Module's permission union, declared `as const` at the call site. */
  perms: readonly TPerm[];
  /** §21.1 — field names this module produces that must be PII-redacted in audit_log. */
  auditRedact?: readonly string[];
}
