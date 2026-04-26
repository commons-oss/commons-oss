/**
 * Core schema barrel. Drizzle-kit reads this file to discover all tables.
 * Module schemas live under `packages/modules/<id>/drizzle/schema.ts` and
 * are picked up via the glob in `drizzle.config.ts`.
 */
export * from "./_helpers.ts";
export * from "./audit.ts";
export * from "./team.ts";
export * from "./person.ts";
export * from "./role.ts";
export * from "./user.ts";
export * from "./org.ts";
