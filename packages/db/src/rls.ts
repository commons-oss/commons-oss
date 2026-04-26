import { sql } from 'drizzle-orm';
import { getDb, type DrizzleDb } from './client.ts';

/**
 * The minimum context every request carries into the DB layer.
 * Mirrors the relevant subset of `ModuleContext` from `@commons-oss/module`
 * — kept narrow here to avoid a circular dependency.
 */
export interface TenantContext {
  verein: { id: string };
  user?: { id: string };
}

/**
 * Open a transaction, set the tenant + user GUCs via `SET LOCAL`, then run `fn`
 * with the transactional db handle. Anything inside the transaction is RLS-scoped
 * to `ctx.verein.id` because every policy reads `current_setting('app.current_verein')`.
 *
 * `SET LOCAL` ties the GUC to the transaction — when it commits or rolls back,
 * the setting is dropped. This is what makes the connection safe to return to
 * the pool: the next checkout starts with no tenant, so a missed `withTenant`
 * means RLS produces empty results, not a leak.
 *
 * Module code MUST go through this helper. Direct use of `getDb()` is reserved
 * for `packages/api` plumbing and migration scripts.
 */
export async function withTenant<T>(
  ctx: TenantContext,
  fn: (tx: DrizzleDb) => Promise<T>,
): Promise<T> {
  if (!isUuid(ctx.verein.id)) {
    throw new Error(`withTenant: invalid verein id ${ctx.verein.id}`);
  }
  if (ctx.user && !isUuid(ctx.user.id)) {
    throw new Error(`withTenant: invalid user id ${ctx.user.id}`);
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    // set_config('key', 'value', true) === SET LOCAL — true = tx-scoped.
    // Parameter binding avoids SQL injection on the GUC value path.
    await tx.execute(
      sql`SELECT set_config('app.current_verein', ${ctx.verein.id}, true)`,
    );
    if (ctx.user) {
      await tx.execute(
        sql`SELECT set_config('app.current_user_id', ${ctx.user.id}, true)`,
      );
    }
    return fn(tx as unknown as DrizzleDb);
  });
}

/**
 * Defense-in-depth wrapper — Phase 1 stub returning the same handle.
 * Phase 2 wires the lint-enforced query builder per §14.4.
 */
export function scoped(_ctx: TenantContext, db: DrizzleDb): DrizzleDb {
  return db;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
