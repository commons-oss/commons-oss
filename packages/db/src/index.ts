export * as schema from './schema/index.ts';
export { closeClient, type DrizzleDb } from './client.ts';
export { scoped, withTenant, type TenantContext } from './rls.ts';

// `getDb` / `getClient` are deliberately NOT re-exported here. Module code
// must go through `withTenant` so RLS is enforced. Plumbing that genuinely
// needs an unscoped handle (currently: nothing in Phase 1; Phase 2 may need
// it for `packages/api` request-resolution before tenant context is known)
// imports from `@commons-oss/db/internal` instead, which the shared ESLint
// config flags everywhere.
