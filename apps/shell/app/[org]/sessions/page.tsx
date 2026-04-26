import { and, count, desc, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { schema as coreSchema, withTenant, type DrizzleDb } from "@commons-oss/db";
import { schema as attendanceSchema } from "@commons-oss/attendance-tracker";
import { requireSession } from "~/src/ctx";
import {
  SessionFilterView,
  applySessionFilter,
  parseSessionFilter,
  type SessionRow,
} from "./_components/session-filter.tsx";

interface Props {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ filter?: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Verlauf (M2) — past sessions list for the trainer's teams. Each row
 * shows date + kind, a 3-segment status bar (present/excused/absent),
 * counts, and a present-rate percentage. Filter chips (Alle/Training/Spiele)
 * are client-side; queries return everything sorted desc.
 *
 * Roster size is read from `team_membership` at render time. Kept simple
 * for Phase 1 — Phase 2 may snapshot it onto `event` so historical roster
 * changes don't skew old percentages.
 */
export default async function SessionsPage({ params, searchParams }: Props) {
  const { org } = await params;
  const sp = await searchParams;
  const activeFilter = parseSessionFilter(sp.filter);
  const session = await requireSession(org);
  const t = await getTranslations("attendance-tracker");
  const locale = (await getLocale()) as "de" | "en";

  const rows = await withTenant(
    { org: { id: session.orgId }, user: { id: session.userId } },
    async (db) => loadPastSessions(db, session.userId, session.orgId),
  );

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", {
    day: "numeric",
    month: "short",
  });
  const dayFmt = new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", {
    weekday: "short",
  });

  const allItems: SessionRow[] = rows.map((r) => ({
    id: r.eventId,
    teamName: r.teamName,
    kind: r.kind,
    title: r.title,
    date: dateFmt.format(r.startsAt),
    day: dayFmt.format(r.startsAt),
    present: r.present,
    excused: r.excused,
    absent: r.absent,
    rosterSize: r.rosterSize,
  }));
  const items = applySessionFilter(allItems, activeFilter);

  return (
    <div style={{ maxWidth: 720 }}>
      <header style={{ marginBottom: 16 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "-0.4px",
          }}
        >
          {t("sessionsTitle")}
        </h1>
        <div style={{ fontSize: 13, color: "var(--brand-mute)", marginTop: 4 }}>
          {t("sessionsCount", { count: allItems.length })}
        </div>
      </header>

      {allItems.length === 0 ? (
        <div
          style={{
            padding: 24,
            border: "1px solid var(--brand-border)",
            borderRadius: 8,
            color: "var(--brand-mute)",
          }}
        >
          {t("sessionsEmpty")}
        </div>
      ) : (
        <SessionFilterView
          items={items}
          active={activeFilter}
          basePath={`/${org}/sessions`}
          labels={{
            all: t("filterAll"),
            training: t("filterTraining"),
            match: t("filterMatch"),
            present: t("summaryPresent"),
            excused: t("summaryExcused"),
            absent: t("summaryAbsent"),
          }}
        />
      )}
    </div>
  );
}

interface PastSessionRow {
  eventId: string;
  teamName: string;
  kind: "training" | "match" | "other";
  title: string | null;
  startsAt: Date;
  present: number;
  excused: number;
  absent: number;
  rosterSize: number;
}

async function loadPastSessions(
  db: DrizzleDb,
  userId: string,
  orgId: string,
): Promise<PastSessionRow[]> {
  const coachTeams = await db
    .select({ teamId: coreSchema.memberRole.teamId })
    .from(coreSchema.memberRole)
    .innerJoin(
      coreSchema.orgMember,
      eq(coreSchema.orgMember.id, coreSchema.memberRole.memberId),
    )
    .innerJoin(coreSchema.role, eq(coreSchema.role.id, coreSchema.memberRole.roleId))
    .where(
      and(
        eq(coreSchema.orgMember.userId, userId),
        eq(coreSchema.orgMember.orgId, orgId),
        eq(coreSchema.role.key, "coach"),
        isNotNull(coreSchema.memberRole.teamId),
      ),
    );

  const teamIds = coachTeams
    .map((r) => r.teamId)
    .filter((id): id is string => id !== null);
  if (teamIds.length === 0) return [];

  const now = new Date();

  const events = await db
    .select({
      eventId: attendanceSchema.event.id,
      teamId: attendanceSchema.event.teamId,
      teamName: coreSchema.team.name,
      kind: attendanceSchema.event.kind,
      title: attendanceSchema.event.title,
      startsAt: attendanceSchema.event.startsAt,
    })
    .from(attendanceSchema.event)
    .innerJoin(coreSchema.team, eq(coreSchema.team.id, attendanceSchema.event.teamId))
    .where(
      and(
        inArray(attendanceSchema.event.teamId, teamIds),
        lt(attendanceSchema.event.startsAt, now),
      ),
    )
    .orderBy(desc(attendanceSchema.event.startsAt));

  if (events.length === 0) return [];

  const eventIds = events.map((e) => e.eventId);

  const entries = await db
    .select({
      eventId: attendanceSchema.attendanceEntry.eventId,
      status: attendanceSchema.attendanceEntry.status,
      n: count(),
    })
    .from(attendanceSchema.attendanceEntry)
    .where(inArray(attendanceSchema.attendanceEntry.eventId, eventIds))
    .groupBy(
      attendanceSchema.attendanceEntry.eventId,
      attendanceSchema.attendanceEntry.status,
    );

  const counts = new Map<string, { present: number; excused: number; absent: number }>();
  for (const e of entries) {
    const c = counts.get(e.eventId) ?? { present: 0, excused: 0, absent: 0 };
    if (e.status === "present") c.present = e.n;
    else if (e.status === "excused") c.excused = e.n;
    else if (e.status === "absent") c.absent = e.n;
    counts.set(e.eventId, c);
  }

  const rosterSizes = await db
    .select({
      teamId: coreSchema.teamMembership.teamId,
      n: count(),
    })
    .from(coreSchema.teamMembership)
    .where(
      and(
        inArray(coreSchema.teamMembership.teamId, teamIds),
        eq(coreSchema.teamMembership.kind, "player"),
      ),
    )
    .groupBy(coreSchema.teamMembership.teamId);

  const rosterByTeam = new Map(rosterSizes.map((r) => [r.teamId, r.n]));

  return events.map((e) => {
    const c = counts.get(e.eventId) ?? { present: 0, excused: 0, absent: 0 };
    return {
      eventId: e.eventId,
      teamName: e.teamName,
      kind: e.kind,
      title: e.title,
      startsAt: e.startsAt,
      present: c.present,
      excused: c.excused,
      absent: c.absent,
      rosterSize: rosterByTeam.get(e.teamId) ?? 0,
    };
  });
}
