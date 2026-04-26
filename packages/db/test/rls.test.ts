import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { externalOrg, org } from '../src/schema/org.ts';
import * as schema from '../src/schema/index.ts';
import { withTenant } from '../src/rls.ts';

/**
 * RLS smoke test. Two tenants, two roles, one truth:
 *   - commons_admin (BYPASSRLS) sets up both tenants.
 *   - commons_app (RLS-enforced) must see exactly the rows of the tenant
 *     whose id was pushed into `app.current_org` via withTenant.
 *   - A query without withTenant must return zero rows — proving that a
 *     missed wrap is a 0-row failure, not a leak.
 */

const adminUrl = process.env['DATABASE_URL_ADMIN'];
const appUrl = process.env['DATABASE_URL'];

const skip = !adminUrl || !appUrl;

describe.skipIf(skip)('RLS', () => {
  // Admin handle (BYPASSRLS) — used to seed two tenants.
  const adminClient = postgres(adminUrl!, { max: 1, prepare: false });
  const adminDb = drizzle(adminClient, { schema });

  let tenantA = '';
  let tenantB = '';
  const slugA = `rls-test-a-${Date.now()}`;
  const slugB = `rls-test-b-${Date.now()}`;

  beforeAll(async () => {
    const [a] = await adminDb
      .insert(org)
      .values({ slug: slugA, name: 'RLS Test A' })
      .returning({ id: org.id });
    const [b] = await adminDb
      .insert(org)
      .values({ slug: slugB, name: 'RLS Test B' })
      .returning({ id: org.id });
    if (!a || !b) throw new Error('failed to seed RLS test tenants');
    tenantA = a.id;
    tenantB = b.id;
  });

  afterAll(async () => {
    await adminDb.execute(sql`DELETE FROM org WHERE slug LIKE 'rls-test-%'`);
    await adminClient.end({ timeout: 5 });
  });

  it('returns only the current tenant when withTenant scopes the query', async () => {
    const visibleFromA = await withTenant({ org: { id: tenantA } }, async (tx) => {
      return tx.select({ id: org.id, slug: org.slug }).from(org);
    });
    const slugs = visibleFromA.map((r) => r.slug);
    expect(slugs).toContain(slugA);
    expect(slugs).not.toContain(slugB);
  });

  it('returns the OTHER tenant when scoped to it', async () => {
    const visibleFromB = await withTenant({ org: { id: tenantB } }, async (tx) => {
      return tx.select({ id: org.id, slug: org.slug }).from(org);
    });
    const slugs = visibleFromB.map((r) => r.slug);
    expect(slugs).toContain(slugB);
    expect(slugs).not.toContain(slugA);
  });

  it('returns zero rows when no withTenant is in effect (closed-default RLS)', async () => {
    // Use a fresh app-role connection bypassing withTenant entirely.
    const appClient = postgres(appUrl!, { max: 1, prepare: false });
    try {
      const rows = await appClient`SELECT id, slug FROM org WHERE slug LIKE 'rls-test-%'`;
      expect(rows).toHaveLength(0);
    } finally {
      await appClient.end({ timeout: 5 });
    }
  });

  it('does not leak the tenant GUC across sequential withTenant calls', async () => {
    // Two sequential withTenant blocks on (likely) the same pooled connection.
    // SET LOCAL ties the GUC to the tx, so the second block must see B's rows
    // only — even if it lands on the connection that just ran A.
    const fromA = await withTenant({ org: { id: tenantA } }, async (tx) =>
      tx.select({ slug: org.slug }).from(org),
    );
    const fromB = await withTenant({ org: { id: tenantB } }, async (tx) =>
      tx.select({ slug: org.slug }).from(org),
    );
    expect(fromA.map((r) => r.slug)).toEqual([slugA]);
    expect(fromB.map((r) => r.slug)).toEqual([slugB]);
  });

  it('rejects a non-UUID org id with a helpful error', async () => {
    await expect(
      withTenant({ org: { id: 'not-a-uuid' } }, () => Promise.resolve(undefined)),
    ).rejects.toThrow(/invalid org id/);
  });

  it('rolls back the whole withTenant block when the callback throws', async () => {
    // Use external_org — it's tenant-scoped, so commons_app CAN insert
    // when the GUC is set. (The org table itself isn't writable from
    // commons_app by design.)
    const partnerName = `rollback-partner-${Date.now()}`;
    await expect(
      withTenant({ org: { id: tenantA } }, async (tx) => {
        await tx
          .insert(externalOrg)
          .values({ orgId: tenantA, name: partnerName });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    // Verify via the admin handle (BYPASSRLS) that no row was committed.
    const rows = await adminDb
      .select({ name: externalOrg.name })
      .from(externalOrg)
      .where(sql`name = ${partnerName}`);
    expect(rows).toHaveLength(0);
  });
});
