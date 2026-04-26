import { sql } from 'drizzle-orm';
import {
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { id, tenantPolicy, timestamps } from './_helpers.ts';
import { mannschaft } from './mannschaft.ts';
import { externalVerein, verein } from './verein.ts';

export const personStatus = pgEnum('person_status', ['active', 'inactive']);

export const mannschaftMembershipKind = pgEnum('mannschaft_membership_kind', [
  'player',
  'staff',
]);

export const guardianRelation = pgEnum('guardian_relation', [
  'mother',
  'father',
  'guardian',
  'other',
]);

export const person = pgTable(
  'person',
  {
    id: id(),
    /** Tenant root — the operating Verein this person record lives under. */
    vereinId: uuid('verein_id')
      .notNull()
      .references(() => verein.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    bornOn: date('born_on'),
    jerseyNumber: integer('jersey_number'),
    photoUrl: text('photo_url'),
    notes: text('notes'),
    status: personStatus('status').notNull().default('active'),
    /**
     * SG attribution. Both NULL = attributed to the operating Verein (default).
     * At most one of the two may be non-NULL (CHECK below).
     * `attendance_entry` (Phase 2) snapshots the resolved attribution at write time.
     */
    attributionVereinId: uuid('attribution_verein_id').references(() => verein.id, {
      onDelete: 'restrict',
    }),
    attributionExternalId: uuid('attribution_external_id').references(
      () => externalVerein.id,
      { onDelete: 'restrict' },
    ),
    ...timestamps,
  },
  (t) => [
    check(
      'person_attribution_at_most_one',
      sql`(${t.attributionVereinId} IS NOT NULL)::int + (${t.attributionExternalId} IS NOT NULL)::int <= 1`,
    ),
    tenantPolicy('person'),
  ],
).enableRLS();

export const mannschaftMembership = pgTable(
  'mannschaft_membership',
  {
    id: id(),
    /** Denormalized for RLS — equals `mannschaft.verein_id`. */
    vereinId: uuid('verein_id')
      .notNull()
      .references(() => verein.id, { onDelete: 'cascade' }),
    mannschaftId: uuid('mannschaft_id')
      .notNull()
      .references(() => mannschaft.id, { onDelete: 'cascade' }),
    personId: uuid('person_id')
      .notNull()
      .references(() => person.id, { onDelete: 'cascade' }),
    kind: mannschaftMembershipKind('kind').notNull().default('player'),
    startsOn: date('starts_on'),
    endsOn: date('ends_on'),
    ...timestamps,
  },
  (t) => [
    unique('mannschaft_membership_unique').on(t.mannschaftId, t.personId, t.kind),
    tenantPolicy('mannschaft_membership'),
  ],
).enableRLS();

export const personGuardian = pgTable(
  'person_guardian',
  {
    id: id(),
    vereinId: uuid('verein_id')
      .notNull()
      .references(() => verein.id, { onDelete: 'cascade' }),
    guardianPersonId: uuid('guardian_person_id')
      .notNull()
      .references(() => person.id, { onDelete: 'cascade' }),
    childPersonId: uuid('child_person_id')
      .notNull()
      .references(() => person.id, { onDelete: 'cascade' }),
    relation: guardianRelation('relation').notNull(),
    ...timestamps,
  },
  (t) => [
    unique('person_guardian_unique').on(t.guardianPersonId, t.childPersonId),
    check('person_guardian_no_self', sql`${t.guardianPersonId} <> ${t.childPersonId}`),
    tenantPolicy('person_guardian'),
  ],
).enableRLS();
