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
 * Operating Verein = tenant root.
 * Tenants are visible only to themselves (RLS filters by id, not verein_id).
 */
export const verein = pgTable(
  'verein',
  {
    id: id(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    localeDefault: text('locale_default').notNull().default('de'),
    settings: jsonb('settings').notNull().default(sql`'{}'::jsonb`),
    ...timestamps,
  },
  (t) => [
    unique('verein_slug_unique').on(t.slug),
    check('verein_locale_check', sql`${t.localeDefault} in ('de','en')`),
    pgPolicy('verein_self', {
      as: 'permissive',
      to: 'commons_app',
      for: 'all',
      using: sql`id = current_setting('app.current_verein', true)::uuid`,
      withCheck: sql`id = current_setting('app.current_verein', true)::uuid`,
    }),
  ],
).enableRLS();

/**
 * Partner Vereine NOT on the platform. Per-tenant registry.
 * Used by `mannschaft_partner` (SG) and `person.attribution_external_id`.
 */
export const externalVerein = pgTable(
  'external_verein',
  {
    id: id(),
    vereinId: uuid('verein_id')
      .notNull()
      .references(() => verein.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    notes: text('notes'),
    /** Set when this partner later joins Commons OSS — preserves attribution history. */
    promotedToVereinId: uuid('promoted_to_verein_id').references(() => verein.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [
    unique('external_verein_name_per_tenant').on(t.vereinId, t.name),
    tenantPolicy('external_verein'),
  ],
).enableRLS();
