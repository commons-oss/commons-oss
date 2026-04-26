import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { id, tenantPolicy, timestamps } from './_helpers.ts';
import { externalVerein, verein } from './verein.ts';

export const mannschaftKind = pgEnum('mannschaft_kind', [
  'kampfmannschaft',
  'reserve',
  'nachwuchs',
  'sonstige',
]);

export const mannschaft = pgTable(
  'mannschaft',
  {
    id: id(),
    vereinId: uuid('verein_id')
      .notNull()
      .references(() => verein.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sektion: text('sektion').notNull().default('fussball'),
    kind: mannschaftKind('kind').notNull().default('sonstige'),
    /** SG flag — when true, `mannschaft_partner` rows describe the participating Vereine. */
    isSg: boolean('is_sg').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    unique('mannschaft_name_per_tenant').on(t.vereinId, t.name),
    tenantPolicy('mannschaft'),
  ],
).enableRLS();

/**
 * SG (Spielgemeinschaft) participants. Only present rows for `mannschaft.is_sg = true`.
 * Each row references EITHER an internal verein (Phase 6+ federation, rare in v1)
 * OR an external_verein (the common v1 case).
 */
export const mannschaftPartner = pgTable(
  'mannschaft_partner',
  {
    id: id(),
    /** Denormalized for RLS — equals `mannschaft.verein_id`. */
    vereinId: uuid('verein_id')
      .notNull()
      .references(() => verein.id, { onDelete: 'cascade' }),
    mannschaftId: uuid('mannschaft_id')
      .notNull()
      .references(() => mannschaft.id, { onDelete: 'cascade' }),
    partnerVereinId: uuid('partner_verein_id').references(() => verein.id, {
      onDelete: 'restrict',
    }),
    partnerExternalId: uuid('partner_external_id').references(() => externalVerein.id, {
      onDelete: 'restrict',
    }),
    ...timestamps,
  },
  (t) => [
    check(
      'mannschaft_partner_exactly_one',
      sql`(${t.partnerVereinId} IS NOT NULL)::int + (${t.partnerExternalId} IS NOT NULL)::int = 1`,
    ),
    tenantPolicy('mannschaft_partner'),
  ],
).enableRLS();
