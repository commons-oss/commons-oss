import { and, eq, inArray } from "drizzle-orm";
import { schema, withTenant } from "@commons-oss/db";

export interface PersonaFlags {
  isCoach: boolean;
  isOfficer: boolean;
}

/**
 * Resolve which UI personas the user qualifies for inside an org.
 *
 * - `isCoach`: holds the `coach` role on at least one team — drives the
 *   trainer-mobile surface (today, sessions).
 * - `isOfficer`: holds `officer` or `orgadmin` at org scope — drives the
 *   admin-desktop surface (overview, reports). `orgadmin` is rolled in
 *   so the bootstrapping admin sees officer destinations without a
 *   separate role assignment.
 *
 * Sessions don't carry roles (auth keeps the cookie minimal), so we
 * always read live. Cheap query: one join over `member_role` filtered
 * by user+org. RLS still applies via `withTenant`.
 */
export async function getUserPersonas(userId: string, orgId: string): Promise<PersonaFlags> {
  return withTenant({ org: { id: orgId }, user: { id: userId } }, async (db) => {
    const rows = await db
      .select({ key: schema.role.key })
      .from(schema.memberRole)
      .innerJoin(schema.orgMember, eq(schema.orgMember.id, schema.memberRole.memberId))
      .innerJoin(schema.role, eq(schema.role.id, schema.memberRole.roleId))
      .where(
        and(
          eq(schema.orgMember.userId, userId),
          eq(schema.orgMember.orgId, orgId),
          inArray(schema.role.key, ["coach", "officer", "orgadmin"]),
        ),
      );

    let isCoach = false;
    let isOfficer = false;
    for (const r of rows) {
      if (r.key === "coach") isCoach = true;
      else isOfficer = true;
    }
    return { isCoach, isOfficer };
  });
}
