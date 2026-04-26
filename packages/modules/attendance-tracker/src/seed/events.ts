import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { org, team } from "@commons-oss/db/schema";
import { event } from "../../drizzle/schema.ts";

/**
 * Demo events seed for FC Musterstadt's U15 + Reserve teams.
 *
 * Generates a small mix of past + upcoming trainings and matches anchored
 * to today, so the attendance page has something to render right after
 * `db:seed`. Idempotent — re-runs no-op via (team_id, starts_at) lookup.
 *
 * Depends on dogfood seed (FC Musterstadt org + U15 + Reserve teams).
 */

interface EventSpec {
  team: "U15" | "Reserve";
  kind: "training" | "match";
  daysFromToday: number;
  hour: number;
  minute: number;
  durationMinutes: number;
  title?: string;
  location?: string;
}

const SPECS: EventSpec[] = [
  // U15 — Tuesday/Thursday training, Saturday match
  { team: "U15", kind: "training", daysFromToday: -21, hour: 17, minute: 30, durationMinutes: 90, location: "Sportplatz Musterstadt" },
  { team: "U15", kind: "training", daysFromToday: -19, hour: 17, minute: 30, durationMinutes: 90, location: "Sportplatz Musterstadt" },
  { team: "U15", kind: "training", daysFromToday: -14, hour: 17, minute: 30, durationMinutes: 90, location: "Sportplatz Musterstadt" },
  { team: "U15", kind: "match", daysFromToday: -10, hour: 10, minute: 0, durationMinutes: 90, title: "U15 vs SV Beispielheim", location: "Sportplatz Musterstadt" },
  { team: "U15", kind: "training", daysFromToday: -7, hour: 17, minute: 30, durationMinutes: 90, location: "Sportplatz Musterstadt" },
  { team: "U15", kind: "training", daysFromToday: -5, hour: 17, minute: 30, durationMinutes: 90, location: "Sportplatz Musterstadt" },
  { team: "U15", kind: "training", daysFromToday: 1, hour: 17, minute: 30, durationMinutes: 90, location: "Sportplatz Musterstadt" },
  { team: "U15", kind: "match", daysFromToday: 4, hour: 10, minute: 0, durationMinutes: 90, title: "U15 @ SV Nachbarort", location: "Auswärts" },
  { team: "U15", kind: "training", daysFromToday: 8, hour: 17, minute: 30, durationMinutes: 90, location: "Sportplatz Musterstadt" },

  // Reserve — Mon/Wed training, Sunday match
  { team: "Reserve", kind: "training", daysFromToday: -20, hour: 19, minute: 0, durationMinutes: 90, location: "Sportplatz Musterstadt" },
  { team: "Reserve", kind: "training", daysFromToday: -18, hour: 19, minute: 0, durationMinutes: 90, location: "Sportplatz Musterstadt" },
  { team: "Reserve", kind: "match", daysFromToday: -16, hour: 14, minute: 0, durationMinutes: 90, title: "Reserve vs FC Probedorf", location: "Sportplatz Musterstadt" },
  { team: "Reserve", kind: "training", daysFromToday: -13, hour: 19, minute: 0, durationMinutes: 90, location: "Sportplatz Musterstadt" },
  { team: "Reserve", kind: "training", daysFromToday: -6, hour: 19, minute: 0, durationMinutes: 90, location: "Sportplatz Musterstadt" },
  { team: "Reserve", kind: "match", daysFromToday: -4, hour: 14, minute: 0, durationMinutes: 90, title: "Reserve @ ATSV Musterhausen", location: "Auswärts" },
  { team: "Reserve", kind: "training", daysFromToday: 2, hour: 19, minute: 0, durationMinutes: 90, location: "Sportplatz Musterstadt" },
  { team: "Reserve", kind: "training", daysFromToday: 4, hour: 19, minute: 0, durationMinutes: 90, location: "Sportplatz Musterstadt" },
  { team: "Reserve", kind: "match", daysFromToday: 6, hour: 14, minute: 0, durationMinutes: 90, title: "Reserve vs SV Demoort", location: "Sportplatz Musterstadt" },
];

async function main(): Promise<void> {
  const url = process.env["DATABASE_URL_ADMIN"] ?? process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL_ADMIN (or DATABASE_URL) must be set.");

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  try {
    const orgRow = await db
      .select({ id: org.id })
      .from(org)
      .where(eq(org.slug, "fc-musterstadt"));
    const demoOrg = orgRow[0];
    if (!demoOrg) throw new Error("FC Musterstadt not found — run db:seed:dogfood first.");

    const teams = await db
      .select({ id: team.id, name: team.name })
      .from(team)
      .where(eq(team.orgId, demoOrg.id));
    const byName = new Map(teams.map((t) => [t.name, t.id]));
    const u15Id = byName.get("U15");
    const reserveId = byName.get("Reserve");
    if (!u15Id || !reserveId) {
      throw new Error("U15 or Reserve team missing — run db:seed:dogfood first.");
    }

    let inserted = 0;
    let skipped = 0;
    for (const spec of SPECS) {
      const teamId = spec.team === "U15" ? u15Id : reserveId;
      const startsAt = relativeDate(spec.daysFromToday, spec.hour, spec.minute);
      const endsAt = new Date(startsAt.getTime() + spec.durationMinutes * 60_000);

      const existing = await db
        .select({ id: event.id })
        .from(event)
        .where(and(eq(event.teamId, teamId), eq(event.startsAt, startsAt)));
      if (existing[0]) {
        skipped++;
        continue;
      }

      await db.insert(event).values({
        orgId: demoOrg.id,
        teamId,
        kind: spec.kind,
        title: spec.title ?? null,
        location: spec.location ?? null,
        startsAt,
        endsAt,
      });
      inserted++;
    }

    console.warn(`✓ events seeded: ${inserted} inserted, ${skipped} skipped`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

function relativeDate(daysFromToday: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return d;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
