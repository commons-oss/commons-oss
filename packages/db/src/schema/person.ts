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
import { team } from './team.ts';
import { externalOrg, org } from './org.ts';

export const personStatus = pgEnum('person_status', ['active', 'inactive']);

export const teamMembershipKind = pgEnum('team_membership_kind', [
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
    /** Tenant root — the operating org this person record lives under. */
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    bornOn: date('born_on'),
    jerseyNumber: integer('jersey_number'),
    photoUrl: text('photo_url'),
    notes: text('notes'),
    status: personStatus('status').notNull().default('active'),
    /**
     * Partnership attribution. Both NULL = attributed to the operating org
     * (default). At most one of the two may be non-NULL (CHECK below).
     * `attendance_entry` (Phase 2) snapshots the resolved attribution at
     * write time.
     */
    attributionOrgId: uuid('attribution_org_id').references(() => org.id, {
      onDelete: 'restrict',
    }),
    attributionExternalId: uuid('attribution_external_id').references(
      () => externalOrg.id,
      { onDelete: 'restrict' },
    ),
    ...timestamps,
  },
  (t) => [
    check(
      'person_attribution_at_most_one',
      sql`(${t.attributionOrgId} IS NOT NULL)::int + (${t.attributionExternalId} IS NOT NULL)::int <= 1`,
    ),
    tenantPolicy('person'),
  ],
).enableRLS();

export const teamMembership = pgTable(
  'team_membership',
  {
    id: id(),
    /** Denormalized for RLS — equals `team.org_id`. */
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    personId: uuid('person_id')
      .notNull()
      .references(() => person.id, { onDelete: 'cascade' }),
    kind: teamMembershipKind('kind').notNull().default('player'),
    startsOn: date('starts_on'),
    endsOn: date('ends_on'),
    ...timestamps,
  },
  (t) => [
    unique('team_membership_unique').on(t.teamId, t.personId, t.kind),
    tenantPolicy('team_membership'),
  ],
).enableRLS();

export const personGuardian = pgTable(
  'person_guardian',
  {
    id: id(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
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
