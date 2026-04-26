#!/usr/bin/env node
/**
 * RLS guard. Scans drizzle migration SQL and fails CI if any tenant-scoped
 * table (one with an `org_id` column) is missing either:
 *   - `ALTER TABLE "<name>" ENABLE ROW LEVEL SECURITY;`
 *   - a `CREATE POLICY ... ON "<name>" ...` referencing `app.current_org`.
 *
 * The closed-default contract is "no row leaves the tenant". Drizzle won't
 * stop you from adding a column without RLS — this script does.
 *
 * Run: `node scripts/check-rls.mjs`. Exits non-zero on violations and prints
 * one finding per line so CI logs stay greppable.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "packages/db/drizzle";

const sqlFiles = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const violations = [];

for (const file of sqlFiles) {
  const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

  // Pull every CREATE TABLE "<name>" ( ... ) block.
  const tableRegex = /CREATE TABLE\s+"([^"]+)"\s*\(([\s\S]*?)\);/g;
  for (const m of sql.matchAll(tableRegex)) {
    const [, name, body] = m;
    const hasOrgId = /"org_id"\s+uuid/i.test(body);
    if (!hasOrgId) continue;

    const enableRls = new RegExp(`ALTER TABLE\\s+"${name}"\\s+ENABLE ROW LEVEL SECURITY`, "i").test(
      sql,
    );
    const hasPolicy = new RegExp(
      `CREATE POLICY\\s+"[^"]+"\\s+ON\\s+"${name}"[^;]*app\\.current_org`,
      "i",
    ).test(sql);

    if (!enableRls) {
      violations.push(`${file}: table "${name}" has org_id but missing ENABLE ROW LEVEL SECURITY`);
    }
    if (!hasPolicy) {
      violations.push(
        `${file}: table "${name}" has org_id but no CREATE POLICY referencing app.current_org`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error("RLS guard: tenant-scoped tables missing RLS coverage:");
  for (const v of violations) console.error("  - " + v);
  console.error(
    "\nFix: add ALTER TABLE ... ENABLE ROW LEVEL SECURITY and a CREATE POLICY " +
      "using app.current_org. See packages/db/README.md for the contract.",
  );
  process.exit(1);
}

console.log(`RLS guard: ${sqlFiles.length} migration file(s) clean.`);
