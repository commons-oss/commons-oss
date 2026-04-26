import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * Migration runner. Uses the `commons_admin` role (BYPASSRLS) so DDL applies
 * cleanly. Connects via DATABASE_URL_ADMIN if present, otherwise falls back
 * to DATABASE_URL — but the pinned local-dev recipe uses the admin URL.
 */
async function main(): Promise<void> {
  const url = process.env['DATABASE_URL_ADMIN'] ?? process.env['DATABASE_URL'];
  if (!url) {
    console.error('DATABASE_URL_ADMIN (or DATABASE_URL) must be set.');
    process.exit(1);
  }

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log('Migrations applied.');

  await client.end({ timeout: 5 });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
