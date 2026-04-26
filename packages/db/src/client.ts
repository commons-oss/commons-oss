import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

/**
 * The application connection runs as `commons_app`, a non-superuser role
 * created by `docker/postgres-init/00-roles.sql` (and equivalent in prod).
 * RLS policies on every org-scoped table filter rows by the
 * `app.current_org` GUC, set per-request inside `withTenant`.
 *
 * Migration runner uses `commons_admin` (BYPASSRLS) — see `migrate.ts`.
 */

let _client: postgres.Sql | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

function resolveAppUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and start the compose Postgres.",
    );
  }
  return url;
}

export function getClient(): postgres.Sql {
  if (!_client) {
    _client = postgres(resolveAppUrl(), {
      max: 10,
      idle_timeout: 30,
      // Required for `SET LOCAL` to behave correctly across pool checkouts.
      prepare: false,
    });
  }
  return _client;
}

export function getDb(): DrizzleDb {
  if (!_db) {
    _db = drizzle(getClient(), { schema });
  }
  return _db;
}

export async function closeClient(): Promise<void> {
  if (_client) {
    await _client.end({ timeout: 5 });
    _client = undefined;
    _db = undefined;
  }
}
