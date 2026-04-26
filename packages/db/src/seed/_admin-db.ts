import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema/index.ts';

/**
 * Seed scripts connect via the admin role (BYPASSRLS). They write to multiple
 * tenants in one go — RLS would otherwise block that.
 */
export function getAdminDb(): {
  db: ReturnType<typeof drizzle<typeof schema>>;
  close: () => Promise<void>;
} {
  const url = process.env['DATABASE_URL_ADMIN'] ?? process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL_ADMIN (or DATABASE_URL) must be set.');
  const client = postgres(url, { max: 1, prepare: false });
  return {
    db: drizzle(client, { schema }),
    close: () => client.end({ timeout: 5 }),
  };
}
