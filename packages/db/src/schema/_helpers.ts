import { sql } from 'drizzle-orm';
import { pgPolicy, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Standard timestamp columns. Audit semantics live in `audit_log` (§21);
 * `created_at` here is just "row exists since".
 */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const id = () => uuid('id').primaryKey().defaultRandom();

/**
 * Tenant policy applied to every verein-scoped table.
 * `commons_app` connections see only rows where verein_id matches the GUC.
 * `commons_admin` (migration runner) bypasses RLS via BYPASSRLS attribute.
 *
 * `current_setting(..., true)` (missing_ok = true) returns NULL when the GUC
 * was never set on this transaction. NULL on either side of `=` evaluates
 * false, so a missed `withTenant` returns zero rows instead of raising
 * "unrecognized configuration parameter". Closed-default by construction.
 */
export const tenantPolicy = (tableName: string) =>
  pgPolicy(`${tableName}_tenant`, {
    as: 'permissive',
    to: 'commons_app',
    for: 'all',
    using: sql`verein_id = current_setting('app.current_verein', true)::uuid`,
    withCheck: sql`verein_id = current_setting('app.current_verein', true)::uuid`,
  });

/**
 * Tenant policy with a NULL pass-through — used for system-shared tables
 * like `role` and `role_permission` where verein_id IS NULL marks
 * platform-wide rows visible to every tenant.
 */
export const tenantOrSystemPolicy = (tableName: string) =>
  pgPolicy(`${tableName}_tenant_or_system`, {
    as: 'permissive',
    to: 'commons_app',
    for: 'all',
    using: sql`verein_id IS NULL OR verein_id = current_setting('app.current_verein', true)::uuid`,
    withCheck: sql`verein_id IS NULL OR verein_id = current_setting('app.current_verein', true)::uuid`,
  });
