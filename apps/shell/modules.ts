import { buildRegistry, type ModuleDefinition } from "@commons-oss/module";
import { attendanceTracker } from "@commons-oss/attendance-tracker";

/**
 * Phase 1: static module registry. Add modules here as they land.
 * Phase 3 swaps this for an env-driven loader (`COMMONS_MODULES=attendance-tracker,...`).
 */
const modules: ModuleDefinition[] = [attendanceTracker];

export const registry = buildRegistry(modules);
