import { and, eq, isNull } from "drizzle-orm";
import { getAdminDb } from "./_admin-db.ts";
import {
  externalOrg,
  team,
  partnerTeam,
  teamMembership,
  person,
  role,
  user,
  orgMember,
  memberRole,
  org,
} from "../schema/index.ts";

/**
 * Dogfood seed. Generic demo org (FC Musterstadt) as the operating tenant.
 * One partnership team (U13) with SV Nachbarort as an external_org partner —
 * to prove the partnership path end-to-end.
 *
 * Max Mustermann as the multi-role example (Reserve player, U15 coach, treasurer).
 * Sabine Vorstand as the officer-only example, so the officer landing
 * (Phase 2 D1 overview) can be smoke-tested without coach noise.
 *
 * Idempotent — safe to re-run. Re-uses rows by natural keys.
 */

async function main(): Promise<void> {
  const { db, close } = getAdminDb();
  try {
    // 1. Operating org
    const demoOrg = await upsertOrg(db, {
      slug: "fc-musterstadt",
      name: "FC Musterstadt",
    });

    // 2. External partner (SV Nachbarort — U13 partner, NOT on the platform)
    const partner = await upsertExternalOrg(db, {
      orgId: demoOrg.id,
      name: "SV Nachbarort",
      contactEmail: "office@sv-nachbarort.example",
    });

    // 3. Teams
    const reserve = await upsertTeam(db, {
      orgId: demoOrg.id,
      name: "Reserve",
      kind: "reserve",
    });
    const u15 = await upsertTeam(db, {
      orgId: demoOrg.id,
      name: "U15",
      kind: "youth",
    });
    const u13Partnership = await upsertTeam(db, {
      orgId: demoOrg.id,
      name: "U13 SG Musterstadt/Nachbarort",
      kind: "youth",
      isPartnership: true,
    });

    // 4. Partner record for the U13
    await upsertPartnerTeam(db, {
      orgId: demoOrg.id,
      teamId: u13Partnership.id,
      partnerExternalId: partner.id,
    });

    // 5. People — Max (Reserve player + U15 coach) and one partnership kid
    //    attributed to the external partner.
    const max = await upsertPerson(db, {
      orgId: demoOrg.id,
      firstName: "Max",
      lastName: "Mustermann",
      bornOn: "1992-04-12",
    });
    const partnerKid = await upsertPerson(db, {
      orgId: demoOrg.id,
      firstName: "Anna",
      lastName: "Beispiel",
      bornOn: "2012-08-03",
      attributionExternalId: partner.id,
    });

    await upsertMembership(db, {
      orgId: demoOrg.id,
      teamId: reserve.id,
      personId: max.id,
      kind: "player",
    });
    await upsertMembership(db, {
      orgId: demoOrg.id,
      teamId: u15.id,
      personId: max.id,
      kind: "staff",
    });
    await upsertMembership(db, {
      orgId: demoOrg.id,
      teamId: u13Partnership.id,
      personId: partnerKid.id,
      kind: "player",
    });

    // 5b. Small roster so attendance demos aren't a list of one.
    //     Generic placeholder names — keep boring, this is a public demo seed.
    const u15Roster = [
      [1, "Lukas", "Berger"],
      [4, "Stefan", "Pichler"],
      [6, "Tobias", "Wagner"],
      [9, "Florian", "Hofer"],
      [10, "Daniel", "Reiter"],
      [11, "Markus", "Steiner"],
      [14, "Jonas", "Köhler"],
      [17, "Paul", "Lenz"],
    ] as const;
    for (const [jersey, first, last] of u15Roster) {
      const p = await upsertPerson(db, {
        orgId: demoOrg.id,
        firstName: first,
        lastName: last,
        bornOn: "2010-06-15",
        jerseyNumber: jersey,
      });
      await upsertMembership(db, {
        orgId: demoOrg.id,
        teamId: u15.id,
        personId: p.id,
        kind: "player",
      });
    }

    const reserveRoster = [
      [2, "Andreas", "Gruber"],
      [5, "Patrick", "Müller"],
      [7, "Christian", "Bauer"],
      [8, "Michael", "Schmid"],
      [13, "Sebastian", "Pirker"],
    ] as const;
    for (const [jersey, first, last] of reserveRoster) {
      const p = await upsertPerson(db, {
        orgId: demoOrg.id,
        firstName: first,
        lastName: last,
        bornOn: "1995-03-20",
        jerseyNumber: jersey,
      });
      await upsertMembership(db, {
        orgId: demoOrg.id,
        teamId: reserve.id,
        personId: p.id,
        kind: "player",
      });
    }

    // 6. User + org_member + multi-role
    const maxUser = await upsertUser(db, {
      logtoSub: "dogfood|max-mustermann",
      email: "max.mustermann@example.test",
    });
    const maxMember = await upsertOrgMember(db, {
      orgId: demoOrg.id,
      userId: maxUser.id,
    });

    const coachRoleId = await getSystemRoleId(db, "coach");
    const playerRoleId = await getSystemRoleId(db, "player");
    const officerRoleId = await getSystemRoleId(db, "officer");

    await upsertMemberRole(db, {
      orgId: demoOrg.id,
      memberId: maxMember.id,
      roleId: playerRoleId,
      teamId: reserve.id,
      title: "IV",
    });
    await upsertMemberRole(db, {
      orgId: demoOrg.id,
      memberId: maxMember.id,
      roleId: coachRoleId,
      teamId: u15.id,
      title: "Cheftrainer",
    });
    await upsertMemberRole(db, {
      orgId: demoOrg.id,
      memberId: maxMember.id,
      roleId: officerRoleId,
      teamId: null,
      title: "Kassier",
    });

    // 7. Officer-only user — Sabine Vorstand. No team memberships, no
    //    coach role; lands on the admin surface only. Lets us smoke-test
    //    the officer persona without coach-side noise.
    const sabineUser = await upsertUser(db, {
      logtoSub: "dogfood|sabine-vorstand",
      email: "sabine.vorstand@example.test",
    });
    const sabineMember = await upsertOrgMember(db, {
      orgId: demoOrg.id,
      userId: sabineUser.id,
    });
    await upsertMemberRole(db, {
      orgId: demoOrg.id,
      memberId: sabineMember.id,
      roleId: officerRoleId,
      teamId: null,
      title: "Obfrau",
    });

    console.log(
      "✓ dogfood seeded: FC Musterstadt + 1 partnership team + Max multi-role + Sabine officer",
    );
  } finally {
    await close();
  }
}

// ---------- upsert helpers ----------

type Db = ReturnType<typeof getAdminDb>["db"];

async function upsertOrg(db: Db, o: { slug: string; name: string }): Promise<{ id: string }> {
  const r = await db
    .insert(org)
    .values(o)
    .onConflictDoUpdate({ target: org.slug, set: { name: o.name } })
    .returning({ id: org.id });
  if (!r[0]) throw new Error(`upsertOrg failed for ${o.slug}`);
  return r[0];
}

async function upsertExternalOrg(
  db: Db,
  e: { orgId: string; name: string; contactEmail?: string },
): Promise<{ id: string }> {
  const r = await db
    .insert(externalOrg)
    .values(e)
    .onConflictDoUpdate({
      target: [externalOrg.orgId, externalOrg.name],
      set: { contactEmail: e.contactEmail ?? null },
    })
    .returning({ id: externalOrg.id });
  if (!r[0]) throw new Error(`upsertExternalOrg failed for ${e.name}`);
  return r[0];
}

async function upsertTeam(
  db: Db,
  t: {
    orgId: string;
    name: string;
    kind: "first" | "reserve" | "youth" | "other";
    isPartnership?: boolean;
  },
): Promise<{ id: string }> {
  const r = await db
    .insert(team)
    .values({ ...t, isPartnership: t.isPartnership ?? false })
    .onConflictDoUpdate({
      target: [team.orgId, team.name],
      set: { kind: t.kind, isPartnership: t.isPartnership ?? false },
    })
    .returning({ id: team.id });
  if (!r[0]) throw new Error(`upsertTeam failed for ${t.name}`);
  return r[0];
}

async function upsertPartnerTeam(
  db: Db,
  p: {
    orgId: string;
    teamId: string;
    partnerOrgId?: string;
    partnerExternalId?: string;
  },
): Promise<void> {
  const existing = await db
    .select({ id: partnerTeam.id })
    .from(partnerTeam)
    .where(
      and(
        eq(partnerTeam.teamId, p.teamId),
        p.partnerExternalId
          ? eq(partnerTeam.partnerExternalId, p.partnerExternalId)
          : eq(partnerTeam.partnerOrgId, p.partnerOrgId!),
      ),
    );
  if (existing.length > 0) return;
  await db.insert(partnerTeam).values(p);
}

async function upsertPerson(
  db: Db,
  p: {
    orgId: string;
    firstName: string;
    lastName: string;
    bornOn?: string;
    jerseyNumber?: number;
    attributionExternalId?: string;
  },
): Promise<{ id: string }> {
  const existing = await db
    .select({ id: person.id })
    .from(person)
    .where(
      and(
        eq(person.orgId, p.orgId),
        eq(person.firstName, p.firstName),
        eq(person.lastName, p.lastName),
      ),
    );
  if (existing[0]) return existing[0];
  const r = await db.insert(person).values(p).returning({ id: person.id });
  if (!r[0]) throw new Error(`upsertPerson failed for ${p.firstName} ${p.lastName}`);
  return r[0];
}

async function upsertMembership(
  db: Db,
  m: {
    orgId: string;
    teamId: string;
    personId: string;
    kind: "player" | "staff";
  },
): Promise<void> {
  await db
    .insert(teamMembership)
    .values(m)
    .onConflictDoNothing({
      target: [teamMembership.teamId, teamMembership.personId, teamMembership.kind],
    });
}

async function upsertUser(db: Db, u: { logtoSub: string; email: string }): Promise<{ id: string }> {
  const r = await db
    .insert(user)
    .values(u)
    .onConflictDoUpdate({ target: user.logtoSub, set: { email: u.email } })
    .returning({ id: user.id });
  if (!r[0]) throw new Error(`upsertUser failed for ${u.logtoSub}`);
  return r[0];
}

async function upsertOrgMember(
  db: Db,
  m: { orgId: string; userId: string },
): Promise<{ id: string }> {
  const r = await db
    .insert(orgMember)
    .values(m)
    .onConflictDoUpdate({
      target: [orgMember.orgId, orgMember.userId],
      set: { status: "active" },
    })
    .returning({ id: orgMember.id });
  if (!r[0]) throw new Error("upsertOrgMember failed");
  return r[0];
}

async function getSystemRoleId(db: Db, key: string): Promise<string> {
  const r = await db
    .select({ id: role.id })
    .from(role)
    .where(and(isNull(role.orgId), eq(role.key, key)));
  if (!r[0]) {
    throw new Error(`system role '${key}' not found — run db:seed:roles first`);
  }
  return r[0].id;
}

async function upsertMemberRole(
  db: Db,
  r: {
    orgId: string;
    memberId: string;
    roleId: string;
    teamId: string | null;
    title: string;
  },
): Promise<void> {
  await db
    .insert(memberRole)
    .values(r)
    .onConflictDoUpdate({
      target: [memberRole.memberId, memberRole.roleId, memberRole.teamId],
      set: { title: r.title },
    });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
