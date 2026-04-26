import { sql } from "drizzle-orm";
import { check, pgEnum, pgPolicy, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { id, tenantPolicy, timestamps } from "./_helpers.ts";
import { person } from "./person.ts";
import { org } from "./org.ts";

export const memberStatus = pgEnum("member_status", ["active", "suspended"]);

/**
 * Global identity table — Logto sub. No org_id; visible to all tenants but
 * filtered through join tables (`org_member`) before app code reads it.
 *
 * RLS policy: a session can read user rows that are linked to its current org.
 */
export const user = pgTable(
  "user",
  {
    id: id(),
    logtoSub: text("logto_sub").notNull(),
    email: text("email").notNull(),
    defaultLocale: text("default_locale").notNull().default("de"),
    ...timestamps,
  },
  (t) => [
    unique("user_logto_sub_unique").on(t.logtoSub),
    check("user_locale_check", sql`${t.defaultLocale} in ('de','en')`),
    pgPolicy("user_via_org", {
      as: "permissive",
      to: "commons_app",
      for: "all",
      using: sql`EXISTS (
        SELECT 1 FROM org_member om
        WHERE om.user_id = id
        AND om.org_id = current_setting('app.current_org', true)::uuid
      )`,
      withCheck: sql`true`,
    }),
  ],
).enableRLS();

export const orgMember = pgTable(
  "org_member",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: memberStatus("status").notNull().default("active"),
    ...timestamps,
  },
  (t) => [unique("org_member_unique").on(t.orgId, t.userId), tenantPolicy("org_member")],
).enableRLS();

/**
 * 0..1 binding from a person record to a login. Set when a player/parent
 * claims their account (Phase 3 minor consent flow).
 */
export const personUserLink = pgTable(
  "person_user_link",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    claimedAt: timestamps.createdAt,
  },
  (t) => [
    unique("person_user_link_person_unique").on(t.orgId, t.personId),
    unique("person_user_link_user_unique").on(t.orgId, t.userId),
    tenantPolicy("person_user_link"),
  ],
).enableRLS();
