import { sql } from 'drizzle-orm';
import { getAdminDb } from './_admin-db.ts';

/**
 * Drop all tables in the public schema. Local-dev only — guarded against
 * production by requiring a non-prod-looking DATABASE_URL_ADMIN.
 *
 * After reset, run `pnpm db:push` (or `db:migrate`) to recreate the schema.
 */
async function main(): Promise<void> {
  const url = process.env['DATABASE_URL_ADMIN'] ?? process.env['DATABASE_URL'] ?? '';
  if (!/localhost|127\.0\.0\.1|host\.docker\.internal/.test(url)) {
    throw new Error(
      `db:reset refused — DATABASE_URL_ADMIN must point at localhost. Got: ${url || '(empty)'}`,
    );
  }

  const { db, close } = getAdminDb();
  try {
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await db.execute(sql`DROP SCHEMA public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    await db.execute(sql`GRANT USAGE ON SCHEMA public TO commons_app`);
    await db.execute(
      sql`ALTER DEFAULT PRIVILEGES FOR ROLE commons_admin IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO commons_app`,
    );
    await db.execute(
      sql`ALTER DEFAULT PRIVILEGES FOR ROLE commons_admin IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO commons_app`,
    );
    console.log('✓ public schema dropped + recreated. Run db:push next.');
  } finally {
    await close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
