# @commons-oss/db

Drizzle schema, RLS helpers, and migration runner for Commons OSS.

This package owns: the multi-tenant Postgres schema, the `withTenant`
helper that every request must go through, and the seed scripts.

## Two-role model

| Role            | BYPASSRLS | Used by                                     |
| --------------- | --------- | ------------------------------------------- |
| `commons_admin` | yes       | migrations, seeds, anything cross-tenant    |
| `commons_app`   | no        | the running app — RLS-enforced at all times |

Both roles are seeded by `docker/postgres-init/00-roles.sql` for local
dev. In production, create them via Terraform/Pulumi or your provider's
console — same names, same attributes.

URLs:

- `DATABASE_URL` → `commons_app` (the app reads this)
- `DATABASE_URL_ADMIN` → `commons_admin` (migrations + seeds)

## RLS contract

Every org-scoped table has RLS enabled and a policy filtering by
`current_setting('app.current_org', true)::uuid`. The `, true` part
makes the GUC **missing-OK** — a missed `withTenant` returns NULL, which
fails the equality check, which returns zero rows. Closed by default.

System-shared tables (`role`, `role_permission` with `org_id IS NULL`)
use `tenantOrSystemPolicy` so all tenants can read the system rows.

## How to read or write data

Always:

```ts
import { withTenant } from "@commons-oss/db";

const result = await withTenant({ org: { id: orgId } }, async (tx) => {
  return tx.select().from(person).where(eq(person.lastName, "Mustermann"));
});
```

`withTenant` opens a transaction, sets the GUCs via `SET LOCAL`, runs
your callback with the transactional Drizzle handle, and commits on
success / rolls back on throw. The connection returns to the pool clean —
no GUC leaks across requests.

**Never import `@commons-oss/db/internal`** unless you are: an auth
callback that runs before the org context exists, a migration script,
or a seed. The shared ESLint config flags every other call site.

## Locking patterns

### Read-modify-write under concurrency

If you need to read a row, decide based on its value, and write back —
without losing updates from concurrent writers — take a row lock:

```ts
await withTenant(ctx, async (tx) => {
  const [row] = await tx.select().from(invoice).where(eq(invoice.id, invoiceId)).for("update"); // SELECT ... FOR UPDATE — blocks other writers

  if (row.status === "pending") {
    await tx
      .update(invoice)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(invoice.id, invoiceId));
  }
});
```

The lock is released when the transaction commits. Hold it for as short
a window as possible — don't make external API calls inside the lock.

### Higher-isolation for invariants across rows

Default isolation is `READ COMMITTED`. If you have an invariant that
spans multiple rows (e.g. "sum of payments must equal invoice total"),
either:

- pull it into a single statement with a `CHECK` or a trigger, or
- bump the transaction to `SERIALIZABLE` and add a retry loop on
  Postgres error `40001` (serialization_failure). Drizzle exposes
  `tx.execute(sql\`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE\`)`inside`withTenant`.

Most modules will not need this. If you reach for it, document why in a
comment.

## Migrations

Generate after any schema change:

```bash
pnpm db:generate    # writes drizzle/<n>_<name>.sql
pnpm db:migrate     # applies pending migrations (uses commons_admin)
```

The migrator wraps each generated file in a transaction. Files
containing statements that can't run in a transaction (e.g.
`CREATE INDEX CONCURRENTLY`) need to live in their own migration file
with no other DDL.

`pnpm db:push` is a TTY-only fast path for local iteration — it
introspects the live DB and pushes schema deltas without writing a
migration file. Use for short loops, then `db:generate` once you're
happy.

## Seeds

```bash
pnpm db:seed:roles     # idempotent — system roles + permissions
pnpm db:seed:dogfood   # idempotent — FC Musterstadt + 1 partnership team
pnpm db:seed           # both, in order
```

Seeds are idempotent (`onConflictDoUpdate` / "select then insert") so
re-running is safe. Seeds are NOT wrapped in a single transaction; a
partial failure leaves you with whatever committed before the error.
Re-run to converge.

## Tests

```bash
pnpm test           # one-shot
pnpm test:watch     # for dev
```

The RLS smoke test (`test/rls.test.ts`) requires a live Postgres + the
schema applied. It seeds two short-lived tenants, asserts cross-tenant
isolation, sequential-call isolation, and rollback semantics, then
cleans up. Run `docker compose up -d && pnpm db:migrate` first.
