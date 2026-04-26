import { sql } from "drizzle-orm";
import { check, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import {
  externalOrg,
  id,
  org,
  person,
  team,
  tenantPolicy,
  timestamps,
  user,
} from "@commons-oss/db/schema";

export const eventKind = pgEnum("event_kind", ["training", "match", "other"]);

/**
 * An attendance-relevant event for a team — training, match, or "other"
 * (workshop, meeting, away trip). Always bound to one team. Cancelled
 * events are kept (status field) so attendance history stays auditable.
 */
export const event = pgTable(
  "event",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    kind: eventKind("kind").notNull().default("training"),
    title: text("title"),
    location: text("location"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    note: text("note"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledReason: text("cancelled_reason"),
    ...timestamps,
  },
  () => [tenantPolicy("event")],
).enableRLS();

export const attendanceStatus = pgEnum("attendance_status", ["present", "excused", "absent"]);

/**
 * One row per (event, person). Idempotent upsert on the unique key —
 * trainers re-mark people as the picture clarifies.
 *
 * Attribution snapshot: at write time we copy the person's attribution
 * (operating org / partner external_org) so historical reports survive
 * later partnership changes. See `person.ts` comment for the contract.
 *
 * `recorded_by_user_id` is the user who saved this entry — used for the
 * audit trail and for "you marked this" UI hints.
 */
export const attendanceEntry = pgTable(
  "attendance_entry",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    status: attendanceStatus("status").notNull(),
    note: text("note"),
    recordedByUserId: uuid("recorded_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    attributionOrgId: uuid("attribution_org_id").references(() => org.id, {
      onDelete: "restrict",
    }),
    attributionExternalId: uuid("attribution_external_id").references(() => externalOrg.id, {
      onDelete: "restrict",
    }),
    ...timestamps,
  },
  (t) => [
    unique("attendance_entry_event_person").on(t.eventId, t.personId),
    check(
      "attendance_entry_attribution_at_most_one",
      sql`(${t.attributionOrgId} IS NOT NULL)::int + (${t.attributionExternalId} IS NOT NULL)::int <= 1`,
    ),
    tenantPolicy("attendance_entry"),
  ],
).enableRLS();
