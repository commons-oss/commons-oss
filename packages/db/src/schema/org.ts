import { sql } from 'drizzle-orm';
import {
  check,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { id, tenantPolicy, timestamps } from './_helpers.ts';

/**
 * Operating org = tenant root. "Org" covers every Verein flavor: sports
 * clubs, cultural associations, foundations, etc. Tenants are visible only
 * to themselves (RLS filters by id, not org_id).
 */
export const org = pgTable(
  'org',
  {
    id: id(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    localeDefault: text('locale_default').notNull().default('de'),
    settings: jsonb('settings').notNull().default(sql`'{}'::jsonb`),
    ...timestamps,
  },
  (t) => [
    unique('org_slug_unique').on(t.slug),
    check('org_locale_check', sql`${t.localeDefault} in ('de','en')`),
    pgPolicy('org_self', {
      as: 'permissive',
      to: 'commons_app',
      for: 'all',
      using: sql`id = current_setting('app.current_org', true)::uuid`,
      withCheck: sql`id = current_setting('app.current_org', true)::uuid`,
    }),
  ],
).enableRLS();

/**
 * Partner orgs NOT on the platform. Per-tenant registry.
 * Used by `partner_team` and `person.attribution_external_id`.
 */
export const externalOrg = pgTable(
  'external_org',
  {
    id: id(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    notes: text('notes'),
    /** Set when this partner later joins Commons OSS — preserves attribution history. */
    promotedToOrgId: uuid('promoted_to_org_id').references(() => org.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [
    unique('external_org_name_per_tenant').on(t.orgId, t.name),
    tenantPolicy('external_org'),
  ],
).enableRLS();
