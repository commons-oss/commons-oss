import { sql } from 'drizzle-orm';
import {
  check,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { id, tenantPolicy, timestamps } from './_helpers.ts';
import { person } from './person.ts';
import { verein } from './verein.ts';

export const vereinUserStatus = pgEnum('verein_user_status', ['active', 'suspended']);

/**
 * Global identity table — Logto sub. No verein_id; visible to all tenants but
 * filtered through join tables (`verein_user`) before app code reads it.
 *
 * RLS policy: a session can read user rows that are linked to its current Verein.
 */
export const user = pgTable(
  'user',
  {
    id: id(),
    logtoSub: text('logto_sub').notNull(),
    email: text('email').notNull(),
    defaultLocale: text('default_locale').notNull().default('de'),
    ...timestamps,
  },
  (t) => [
    unique('user_logto_sub_unique').on(t.logtoSub),
    check('user_locale_check', sql`${t.defaultLocale} in ('de','en')`),
    pgPolicy('user_via_verein', {
      as: 'permissive',
      to: 'commons_app',
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM verein_user vu
        WHERE vu.user_id = id
        AND vu.verein_id = current_setting('app.current_verein', true)::uuid
      )`,
      withCheck: sql`true`,
    }),
  ],
).enableRLS();

export const vereinUser = pgTable(
  'verein_user',
  {
    id: id(),
    vereinId: uuid('verein_id')
      .notNull()
      .references(() => verein.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: vereinUserStatus('status').notNull().default('active'),
    ...timestamps,
  },
  (t) => [
    unique('verein_user_unique').on(t.vereinId, t.userId),
    tenantPolicy('verein_user'),
  ],
).enableRLS();

/**
 * 0..1 binding from a person record to a login. Set when a Spieler/Eltern
 * claims their account (Phase 3 minor consent flow).
 */
export const personUserLink = pgTable(
  'person_user_link',
  {
    id: id(),
    vereinId: uuid('verein_id')
      .notNull()
      .references(() => verein.id, { onDelete: 'cascade' }),
    personId: uuid('person_id')
      .notNull()
      .references(() => person.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    claimedAt: timestamps.createdAt,
  },
  (t) => [
    unique('person_user_link_person_unique').on(t.vereinId, t.personId),
    unique('person_user_link_user_unique').on(t.vereinId, t.userId),
    tenantPolicy('person_user_link'),
  ],
).enableRLS();
