import type { ModuleDefinition, Permission } from './types.ts';

/**
 * Phase 1: a static registry. Modules are imported and listed in
 * `apps/shell/modules.ts`. Phase 3 (per plan §7) replaces this with the
 * `COMMONS_MODULES=...` env-driven dynamic registry.
 */
export interface ModuleRegistry {
  modules: ReadonlyArray<ModuleDefinition>;
  byId: ReadonlyMap<string, ModuleDefinition>;
  /** Union of every active module's perms — useful for typing role bundles. */
  allPerms: ReadonlySet<Permission>;
}

/**
 * Cross-module checks happen here:
 *   - duplicate module ids
 *   - duplicate nav item ids (across modules)
 * Hono prefix collisions are caught when `apps/shell` mounts `/api/v1`.
 */
export function buildRegistry(modules: ReadonlyArray<ModuleDefinition>): ModuleRegistry {
  const byId = new Map<string, ModuleDefinition>();
  for (const m of modules) {
    if (byId.has(m.id)) {
      throw new Error(`[registry] duplicate module id '${m.id}'`);
    }
    byId.set(m.id, m);
  }

  const seenNav = new Map<string, string>();
  for (const m of modules) {
    for (const n of m.nav) {
      const prior = seenNav.get(n.id);
      if (prior) {
        throw new Error(
          `[registry] nav id '${n.id}' declared by both '${prior}' and '${m.id}'. Hint: namespace nav ids by module.`,
        );
      }
      seenNav.set(n.id, m.id);
    }
  }

  const allPerms = new Set<Permission>(modules.flatMap((m) => m.perms));
  return { modules, byId, allPerms };
}
