/**
 * Internal escape hatch — exposes the unscoped client + drizzle handle.
 * Importing this from anywhere outside `packages/db/**` and `packages/api/**`
 * is flagged by the shared ESLint config (`no-restricted-imports`).
 *
 * If you reach for this, you are about to query the database without a
 * tenant context. Stop and ask: is there really no `withTenant` shape that
 * fits? The answer is "yes, really" only for:
 *   - request-resolution code that runs BEFORE we know which Verein the
 *     caller belongs to (auth callbacks, Logto webhook handlers)
 *   - admin / cron jobs that intentionally span tenants
 *
 * Everywhere else, use `withTenant`.
 */
export { getClient, getDb } from './client.ts';
