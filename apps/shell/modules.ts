import { buildRegistry, type ModuleDefinition } from "@commons-oss/module";

/**
 * Phase 1: static module registry. Add modules here as they land:
 *
 *   import attendance from '@commons-oss/module-attendance';
 *   const modules: ModuleDefinition[] = [attendance];
 *
 * Phase 3 swaps this for an env-driven loader (`COMMONS_MODULES=attendance,training,...`).
 */
const modules: ModuleDefinition[] = [];

export const registry = buildRegistry(modules);
