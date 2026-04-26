import { and, asc, eq, gt, gte, inArray, isNotNull, ne } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { schema as coreSchema, withTenant, type DrizzleDb } from "@commons-oss/db";
import { schema as attendanceSchema } from "@commons-oss/attendance-tracker";
import { requireSession } from "~/src/ctx";
import { RosterMarker, type RosterPlayer } from "./_components/roster-marker.tsx";

interface Props {
  params: Promise<{ org: string }>;
}

export const dynamic = "force-dynamic";

type Status = "present" | "excused" | "absent";
type EventKind = (typeof attendanceSchema.eventKind.enumValues)[number];

const KIND_KEY: Record<EventKind, "kindTraining" | "kindMatch" | "kindOther"> = {
  training: "kindTraining",
  match: "kindMatch",
  other: "kindOther",
};

/**
 * Heute (M1) — trainer's landing screen on mobile. Picks the next session
 * for any team where the current user holds a `coach` role and renders
 * the 3-state pill marker. Autosave only (no Speichern button) per locked
 * decision §5.4.
 *
 * Phase 2 will add explicit session navigation + a chooser when the user
 * coaches multiple teams.
 */
export default async function TodayPage({ params }: Props) {
  const { org } = await params;
  const session = await requireSession(org);
  const t = await getTranslations("attendance-tracker");
  const locale = (await getLocale()) as "de" | "en";

  const data = await withTenant(
    { org: { id: session.orgId }, user: { id: session.userId } },
    async (db) => loadActiveSession(db, session.userId, session.orgId),
  );

  const upcoming = data
    ? await withTenant(
        { org: { id: session.orgId }, user: { id: session.userId } },
        async (db) =>
          loadUpcoming(db, session.userId, session.orgId, data.event.id),
      )
    : [];

  if (!data) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>{t("pageTitle")}</h1>
        <p style={{ color: "var(--brand-mute)" }}>{t("pageHint")}</p>
        <div
          style={{
            marginTop: 24,
            padding: 24,
            border: "1px solid var(--brand-border)",
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{t("noActiveSession")}</div>
          <div style={{ color: "var(--brand-mute)", fontSize: 14 }}>
            {t("noActiveSessionHint")}
          </div>
        </div>
      </div>
    );
  }

  const { event, team, roster, marks } = data;

  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const timeFmt = new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const kindLabel = t(KIND_KEY[event.kind]);

  return (
    <div className="today-grid">
      <style>{`
        .today-grid {
          max-width: 720px;
        }
        .today-rail {
          display: none;
        }
        @media (min-width: 980px) {
          .today-grid {
            max-width: 1100px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 320px;
            gap: 32px;
            align-items: start;
          }
          .today-rail {
            display: flex;
            flex-direction: column;
            gap: 16px;
            position: sticky;
            top: 24px;
          }
        }
      `}</style>
      <div>
      <header style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 12,
            color: "var(--brand-mute)",
            letterSpacing: "0.02em",
            marginBottom: 6,
          }}
        >
          {team.name}
          {event.cancelledAt ? (
            <span style={{ marginLeft: 8 }}>· {t("cancelled")}</span>
          ) : null}
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: "-0.4px",
            lineHeight: 1.15,
          }}
        >
          {event.title ?? `${kindLabel}, ${dateFmt.format(event.startsAt)}`}
        </h1>
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            color: "var(--brand-mute)",
            display: "flex",
            gap: 12,
          }}
        >
          <span>{timeFmt.format(event.startsAt)}</span>
          {event.location ? <span>· {event.location}</span> : null}
        </div>
      </header>

      <RosterMarker
        orgSlug={org}
        eventId={event.id}
        teamId={team.id}
        roster={roster}
        initialMarks={marks}
      />

      <div
        style={{
          marginTop: 16,
          textAlign: "center",
          fontSize: 12,
          color: "var(--brand-mute)",
        }}
      >
        {t("rosterFooter", { count: roster.length })}
      </div>
      </div>

      <aside className="today-rail" aria-label={t("upcomingTitle")}>
        <div
          style={{
            border: "1px solid var(--brand-border)",
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--brand-mute)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {t("sessionContext")}
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--brand-slate)" }}>
            {team.name}
          </div>
          <div
            style={{
              marginTop: 8,
              display: "grid",
              gridTemplateColumns: "70px 1fr",
              rowGap: 6,
              fontSize: 13,
              color: "var(--brand-slate)",
            }}
          >
            <div style={{ color: "var(--brand-mute)" }}>{t("metaKind")}</div>
            <div>{kindLabel}</div>
            <div style={{ color: "var(--brand-mute)" }}>{t("metaDate")}</div>
            <div>{dateFmt.format(event.startsAt)}</div>
            <div style={{ color: "var(--brand-mute)" }}>{t("metaTime")}</div>
            <div>{timeFmt.format(event.startsAt)}</div>
            {event.location ? (
              <>
                <div style={{ color: "var(--brand-mute)" }}>{t("metaLocation")}</div>
                <div>{event.location}</div>
              </>
            ) : null}
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--brand-border)",
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--brand-mute)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {t("upcomingTitle")}
          </div>
          {upcoming.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--brand-mute)" }}>
              {t("upcomingEmpty")}
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {upcoming.map((u) => (
                <li
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    padding: "8px 0",
                    borderTop: "1px solid var(--brand-border)",
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      flex: "none",
                      fontSize: 12,
                      color: "var(--brand-mute)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {dateFmt.format(u.startsAt)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--brand-slate)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {u.title ?? t(KIND_KEY[u.kind])}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--brand-mute)" }}>
                      {u.teamName} · {timeFmt.format(u.startsAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

interface ActiveSessionData {
  event: {
    id: string;
    kind: EventKind;
    title: string | null;
    location: string | null;
    startsAt: Date;
    cancelledAt: Date | null;
  };
  team: { id: string; name: string };
  roster: RosterPlayer[];
  marks: Record<string, Status>;
}

async function loadActiveSession(
  db: DrizzleDb,
  userId: string,
  orgId: string,
): Promise<ActiveSessionData | null> {
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
  if (teamIds.length === 0) return null;

  const now = new Date();

  const upcoming = await db
    .select({
      id: attendanceSchema.event.id,
      kind: attendanceSchema.event.kind,
      title: attendanceSchema.event.title,
      location: attendanceSchema.event.location,
      startsAt: attendanceSchema.event.startsAt,
      cancelledAt: attendanceSchema.event.cancelledAt,
      teamId: attendanceSchema.event.teamId,
      teamName: coreSchema.team.name,
    })
    .from(attendanceSchema.event)
    .innerJoin(coreSchema.team, eq(coreSchema.team.id, attendanceSchema.event.teamId))
    .where(
      and(
        inArray(attendanceSchema.event.teamId, teamIds),
        gte(attendanceSchema.event.startsAt, now),
      ),
    )
    .orderBy(asc(attendanceSchema.event.startsAt))
    .limit(1);

  const picked = upcoming[0];
  if (!picked) return null;

  const rosterRows = await db
    .select({
      personId: coreSchema.person.id,
      jerseyNumber: coreSchema.person.jerseyNumber,
      firstName: coreSchema.person.firstName,
      lastName: coreSchema.person.lastName,
      notes: coreSchema.person.notes,
    })
    .from(coreSchema.teamMembership)
    .innerJoin(coreSchema.person, eq(coreSchema.person.id, coreSchema.teamMembership.personId))
    .where(
      and(
        eq(coreSchema.teamMembership.teamId, picked.teamId),
        eq(coreSchema.teamMembership.kind, "player"),
      ),
    )
    .orderBy(asc(coreSchema.person.jerseyNumber), asc(coreSchema.person.lastName));

  const marksRows = await db
    .select({
      personId: attendanceSchema.attendanceEntry.personId,
      status: attendanceSchema.attendanceEntry.status,
    })
    .from(attendanceSchema.attendanceEntry)
    .where(eq(attendanceSchema.attendanceEntry.eventId, picked.id));

  const marks: Record<string, Status> = {};
  for (const m of marksRows) marks[m.personId] = m.status;

  return {
    event: {
      id: picked.id,
      kind: picked.kind,
      title: picked.title,
      location: picked.location,
      startsAt: picked.startsAt,
      cancelledAt: picked.cancelledAt,
    },
    team: { id: picked.teamId, name: picked.teamName },
    roster: rosterRows,
    marks,
  };
}

interface UpcomingEvent {
  id: string;
  kind: EventKind;
  title: string | null;
  startsAt: Date;
  teamName: string;
}

async function loadUpcoming(
  db: DrizzleDb,
  userId: string,
  orgId: string,
  exceptEventId: string,
): Promise<UpcomingEvent[]> {
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

  const rows = await db
    .select({
      id: attendanceSchema.event.id,
      kind: attendanceSchema.event.kind,
      title: attendanceSchema.event.title,
      startsAt: attendanceSchema.event.startsAt,
      teamName: coreSchema.team.name,
    })
    .from(attendanceSchema.event)
    .innerJoin(coreSchema.team, eq(coreSchema.team.id, attendanceSchema.event.teamId))
    .where(
      and(
        inArray(attendanceSchema.event.teamId, teamIds),
        gt(attendanceSchema.event.startsAt, now),
        ne(attendanceSchema.event.id, exceptEventId),
      ),
    )
    .orderBy(asc(attendanceSchema.event.startsAt))
    .limit(5);

  return rows;
}
