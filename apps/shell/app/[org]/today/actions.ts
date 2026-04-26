"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { schema as coreSchema, withTenant } from "@commons-oss/db";
import { schema as attendanceSchema } from "@commons-oss/attendance-tracker";
import { requireSession } from "~/src/ctx";

type Status = "present" | "excused" | "absent";

/**
 * Mark a single person's attendance for an event. Idempotent — re-clicking
 * the same status no-ops (well, writes the same row). Snapshot the person's
 * current attribution into the entry so SG cost-splitting reports survive
 * later partnership changes (see person.ts comment).
 */
export async function markAttendance(input: {
  orgSlug: string;
  eventId: string;
  personId: string;
  status: Status;
}): Promise<void> {
  const session = await requireSession(input.orgSlug);

  await withTenant(
    { org: { id: session.orgId }, user: { id: session.userId } },
    async (db) => {
      const personRow = await db
        .select({
          attributionOrgId: coreSchema.person.attributionOrgId,
          attributionExternalId: coreSchema.person.attributionExternalId,
        })
        .from(coreSchema.person)
        .where(eq(coreSchema.person.id, input.personId))
        .limit(1);

      const attribution = personRow[0] ?? {
        attributionOrgId: null,
        attributionExternalId: null,
      };

      await db
        .insert(attendanceSchema.attendanceEntry)
        .values({
          orgId: session.orgId,
          eventId: input.eventId,
          personId: input.personId,
          status: input.status,
          recordedByUserId: session.userId,
          attributionOrgId: attribution.attributionOrgId,
          attributionExternalId: attribution.attributionExternalId,
        })
        .onConflictDoUpdate({
          target: [
            attendanceSchema.attendanceEntry.eventId,
            attendanceSchema.attendanceEntry.personId,
          ],
          set: {
            status: input.status,
            recordedByUserId: session.userId,
            recordedAt: new Date(),
          },
        });
    },
  );

  revalidatePath(`/${input.orgSlug}/today`);
}

/**
 * Mark every roster player as present for an event in one go. Used by the
 * "Alle anwesend" quick action. Existing rows are not overwritten — this
 * fills in the gaps so a trainer can mark exceptions afterwards without
 * losing them. (Mockup behaviour: only auto-fills `null` slots.)
 */
export async function markAllPresent(input: {
  orgSlug: string;
  eventId: string;
  teamId: string;
}): Promise<void> {
  const session = await requireSession(input.orgSlug);

  await withTenant(
    { org: { id: session.orgId }, user: { id: session.userId } },
    async (db) => {
      const roster = await db
        .select({
          personId: coreSchema.teamMembership.personId,
          attributionOrgId: coreSchema.person.attributionOrgId,
          attributionExternalId: coreSchema.person.attributionExternalId,
        })
        .from(coreSchema.teamMembership)
        .innerJoin(
          coreSchema.person,
          eq(coreSchema.person.id, coreSchema.teamMembership.personId),
        )
        .where(
          and(
            eq(coreSchema.teamMembership.teamId, input.teamId),
            eq(coreSchema.teamMembership.kind, "player"),
          ),
        );

      if (roster.length === 0) return;

      const existing = await db
        .select({ personId: attendanceSchema.attendanceEntry.personId })
        .from(attendanceSchema.attendanceEntry)
        .where(
          and(
            eq(attendanceSchema.attendanceEntry.eventId, input.eventId),
            inArray(
              attendanceSchema.attendanceEntry.personId,
              roster.map((r) => r.personId),
            ),
          ),
        );
      const alreadyMarked = new Set(existing.map((e) => e.personId));

      const toInsert = roster
        .filter((r) => !alreadyMarked.has(r.personId))
        .map((r) => ({
          orgId: session.orgId,
          eventId: input.eventId,
          personId: r.personId,
          status: "present" as const,
          recordedByUserId: session.userId,
          attributionOrgId: r.attributionOrgId,
          attributionExternalId: r.attributionExternalId,
        }));

      if (toInsert.length > 0) {
        await db.insert(attendanceSchema.attendanceEntry).values(toInsert);
      }
    },
  );

  revalidatePath(`/${input.orgSlug}/today`);
}
