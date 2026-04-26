import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env['DATABASE_URL_ADMIN'] ?? process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL_ADMIN (or DATABASE_URL) must be set. See .env.example at repo root.',
  );
}

/**
 * Module schemas opt-in to migration generation by exporting tables from
 * `packages/modules/<id>/drizzle/schema.ts`. The glob below picks them up
 * even though no modules exist yet — the glob simply matches nothing.
 *
 * Connection runs as `commons_admin` (BYPASSRLS) so DDL applies cleanly.
 * Application code never uses this connection — it uses the `commons_app`
 * role via `packages/db/src/client.ts`.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: ['./src/schema/index.ts', '../modules/*/drizzle/schema.ts'],
  out: './drizzle',
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
