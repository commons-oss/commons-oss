import { sql } from "drizzle-orm";
import { boolean, check, integer, pgEnum, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { id, tenantPolicy, timestamps } from "./_helpers.ts";
import { externalOrg, org } from "./org.ts";

export const teamKind = pgEnum("team_kind", ["first", "reserve", "youth", "other"]);

export const team = pgTable(
  "team",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    section: text("section").notNull().default("football"),
    kind: teamKind("kind").notNull().default("other"),
    /** Partnership flag (Spielgemeinschaft) — when true, `partner_team` rows
     *  describe the participating orgs. */
    isPartnership: boolean("is_partnership").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [unique("team_name_per_tenant").on(t.orgId, t.name), tenantPolicy("team")],
).enableRLS();

/**
 * Partnership participants (Spielgemeinschaft). Only present rows for
 * `team.is_partnership = true`. Each row references EITHER an internal org
 * (Phase 6+ federation, rare in v1) OR an external_org (the common v1 case).
 */
export const partnerTeam = pgTable(
  "partner_team",
  {
    id: id(),
    /** Denormalized for RLS — equals `team.org_id`. */
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    partnerOrgId: uuid("partner_org_id").references(() => org.id, {
      onDelete: "restrict",
    }),
    partnerExternalId: uuid("partner_external_id").references(() => externalOrg.id, {
      onDelete: "restrict",
    }),
    ...timestamps,
  },
  (t) => [
    check(
      "partner_team_exactly_one",
      sql`(${t.partnerOrgId} IS NOT NULL)::int + (${t.partnerExternalId} IS NOT NULL)::int = 1`,
    ),
    tenantPolicy("partner_team"),
  ],
).enableRLS();
