import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

/**
 * Long-lived admin connection (BYPASSRLS via commons_admin). Only for
 * code that legitimately spans tenants:
 *   - dev-only stub auth picker (enumerates org_member across orgs)
 *   - cron / admin tasks that operate cross-tenant
 *
 * Anything request-scoped should still go through `withTenant` on the app
 * connection. Reusing this from RSC paths defeats RLS.
 */

let _client: postgres.Sql | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export type AdminDrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

function resolveAdminUrl(): string {
  const url = process.env["DATABASE_URL_ADMIN"] ?? process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "DATABASE_URL_ADMIN (or DATABASE_URL) is not set. The admin client is required for cross-tenant code paths.",
    );
  }
  return url;
}

export function getAdminClient(): postgres.Sql {
  if (!_client) {
    _client = postgres(resolveAdminUrl(), { max: 4, idle_timeout: 30, prepare: false });
  }
  return _client;
}

export function getAdminDb(): AdminDrizzleDb {
  if (!_db) {
    _db = drizzle(getAdminClient(), { schema });
  }
  return _db;
}

export async function closeAdminClient(): Promise<void> {
  if (_client) {
    await _client.end({ timeout: 5 });
    _client = undefined;
    _db = undefined;
  }
}
