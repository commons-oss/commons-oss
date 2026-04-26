import { and, eq, isNull } from 'drizzle-orm';
import { getAdminDb } from './_admin-db.ts';
import {
  externalVerein,
  mannschaft,
  mannschaftPartner,
  mannschaftMembership,
  person,
  role,
  user,
  vereinUser,
  vereinUserRole,
  verein,
} from '../schema/index.ts';

/**
 * Dogfood seed. Generic demo Verein (FC Musterstadt) as the operating tenant.
 * One SG (Spielgemeinschaft) Mannschaft (U13) with SV Nachbarort as an
 * external_verein partner — to prove the SG path end-to-end.
 *
 * Max Mustermann as the multi-role example (Reserve player, U15 Trainer, Kassier).
 *
 * Idempotent — safe to re-run. Re-uses rows by natural keys.
 */

async function main(): Promise<void> {
  const { db, close } = getAdminDb();
  try {
    // 1. Operating Verein
    const demoVerein = await upsertVerein(db, {
      slug: 'fc-musterstadt',
      name: 'FC Musterstadt',
    });

    // 2. External partner (SV Nachbarort — SG U13 partner, NOT on the platform)
    const partner = await upsertExternalVerein(db, {
      vereinId: demoVerein.id,
      name: 'SV Nachbarort',
      contactEmail: 'office@sv-nachbarort.example',
    });

    // 3. Mannschaften
    const reserve = await upsertMannschaft(db, {
      vereinId: demoVerein.id,
      name: 'Reserve',
      kind: 'reserve',
    });
    const u15 = await upsertMannschaft(db, {
      vereinId: demoVerein.id,
      name: 'U15',
      kind: 'nachwuchs',
    });
    const u13Sg = await upsertMannschaft(db, {
      vereinId: demoVerein.id,
      name: 'U13 SG Musterstadt/Nachbarort',
      kind: 'nachwuchs',
      isSg: true,
    });

    // 4. SG partner record for the U13
    await upsertMannschaftPartner(db, {
      vereinId: demoVerein.id,
      mannschaftId: u13Sg.id,
      partnerExternalId: partner.id,
    });

    // 5. People — Max (Reserve player + U15 trainer) and one SG kid attributed to the partner
    const max = await upsertPerson(db, {
      vereinId: demoVerein.id,
      firstName: 'Max',
      lastName: 'Mustermann',
      bornOn: '1992-04-12',
    });
    const sgKid = await upsertPerson(db, {
      vereinId: demoVerein.id,
      firstName: 'Anna',
      lastName: 'Beispiel',
      bornOn: '2012-08-03',
      attributionExternalId: partner.id,
    });

    await upsertMembership(db, {
      vereinId: demoVerein.id,
      mannschaftId: reserve.id,
      personId: max.id,
      kind: 'player',
    });
    await upsertMembership(db, {
      vereinId: demoVerein.id,
      mannschaftId: u15.id,
      personId: max.id,
      kind: 'staff',
    });
    await upsertMembership(db, {
      vereinId: demoVerein.id,
      mannschaftId: u13Sg.id,
      personId: sgKid.id,
      kind: 'player',
    });

    // 6. User + verein_user + multi-role
    const maxUser = await upsertUser(db, {
      logtoSub: 'dogfood|max-mustermann',
      email: 'max.mustermann@example.test',
    });
    const maxVu = await upsertVereinUser(db, {
      vereinId: demoVerein.id,
      userId: maxUser.id,
    });

    const trainerRoleId = await getSystemRoleId(db, 'trainer');
    const spielerRoleId = await getSystemRoleId(db, 'spieler');
    const funktionaerRoleId = await getSystemRoleId(db, 'funktionaer');

    await upsertVereinUserRole(db, {
      vereinId: demoVerein.id,
      vereinUserId: maxVu.id,
      roleId: spielerRoleId,
      mannschaftId: reserve.id,
      title: 'IV',
    });
    await upsertVereinUserRole(db, {
      vereinId: demoVerein.id,
      vereinUserId: maxVu.id,
      roleId: trainerRoleId,
      mannschaftId: u15.id,
      title: 'Cheftrainer',
    });
    await upsertVereinUserRole(db, {
      vereinId: demoVerein.id,
      vereinUserId: maxVu.id,
      roleId: funktionaerRoleId,
      mannschaftId: null,
      title: 'Kassier',
    });

    console.log('✓ dogfood seeded: FC Musterstadt + 1 SG Mannschaft + Max multi-role');
  } finally {
    await close();
  }
}

// ---------- upsert helpers ----------

type Db = ReturnType<typeof getAdminDb>['db'];

async function upsertVerein(
  db: Db,
  v: { slug: string; name: string },
): Promise<{ id: string }> {
  const r = await db
    .insert(verein)
    .values(v)
    .onConflictDoUpdate({ target: verein.slug, set: { name: v.name } })
    .returning({ id: verein.id });
  if (!r[0]) throw new Error(`upsertVerein failed for ${v.slug}`);
  return r[0];
}

async function upsertExternalVerein(
  db: Db,
  v: { vereinId: string; name: string; contactEmail?: string },
): Promise<{ id: string }> {
  const r = await db
    .insert(externalVerein)
    .values(v)
    .onConflictDoUpdate({
      target: [externalVerein.vereinId, externalVerein.name],
      set: { contactEmail: v.contactEmail ?? null },
    })
    .returning({ id: externalVerein.id });
  if (!r[0]) throw new Error(`upsertExternalVerein failed for ${v.name}`);
  return r[0];
}

async function upsertMannschaft(
  db: Db,
  m: {
    vereinId: string;
    name: string;
    kind: 'kampfmannschaft' | 'reserve' | 'nachwuchs' | 'sonstige';
    isSg?: boolean;
  },
): Promise<{ id: string }> {
  const r = await db
    .insert(mannschaft)
    .values({ ...m, isSg: m.isSg ?? false })
    .onConflictDoUpdate({
      target: [mannschaft.vereinId, mannschaft.name],
      set: { kind: m.kind, isSg: m.isSg ?? false },
    })
    .returning({ id: mannschaft.id });
  if (!r[0]) throw new Error(`upsertMannschaft failed for ${m.name}`);
  return r[0];
}

async function upsertMannschaftPartner(
  db: Db,
  p: {
    vereinId: string;
    mannschaftId: string;
    partnerVereinId?: string;
    partnerExternalId?: string;
  },
): Promise<void> {
  const existing = await db
    .select({ id: mannschaftPartner.id })
    .from(mannschaftPartner)
    .where(
      and(
        eq(mannschaftPartner.mannschaftId, p.mannschaftId),
        p.partnerExternalId
          ? eq(mannschaftPartner.partnerExternalId, p.partnerExternalId)
          : eq(mannschaftPartner.partnerVereinId, p.partnerVereinId!),
      ),
    );
  if (existing.length > 0) return;
  await db.insert(mannschaftPartner).values(p);
}

async function upsertPerson(
  db: Db,
  p: {
    vereinId: string;
    firstName: string;
    lastName: string;
    bornOn?: string;
    attributionExternalId?: string;
  },
): Promise<{ id: string }> {
  const existing = await db
    .select({ id: person.id })
    .from(person)
    .where(
      and(
        eq(person.vereinId, p.vereinId),
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
    vereinId: string;
    mannschaftId: string;
    personId: string;
    kind: 'player' | 'staff';
  },
): Promise<void> {
  await db
    .insert(mannschaftMembership)
    .values(m)
    .onConflictDoNothing({
      target: [
        mannschaftMembership.mannschaftId,
        mannschaftMembership.personId,
        mannschaftMembership.kind,
      ],
    });
}

async function upsertUser(
  db: Db,
  u: { logtoSub: string; email: string },
): Promise<{ id: string }> {
  const r = await db
    .insert(user)
    .values(u)
    .onConflictDoUpdate({ target: user.logtoSub, set: { email: u.email } })
    .returning({ id: user.id });
  if (!r[0]) throw new Error(`upsertUser failed for ${u.logtoSub}`);
  return r[0];
}

async function upsertVereinUser(
  db: Db,
  vu: { vereinId: string; userId: string },
): Promise<{ id: string }> {
  const r = await db
    .insert(vereinUser)
    .values(vu)
    .onConflictDoUpdate({
      target: [vereinUser.vereinId, vereinUser.userId],
      set: { status: 'active' },
    })
    .returning({ id: vereinUser.id });
  if (!r[0]) throw new Error('upsertVereinUser failed');
  return r[0];
}

async function getSystemRoleId(db: Db, key: string): Promise<string> {
  const r = await db
    .select({ id: role.id })
    .from(role)
    .where(and(isNull(role.vereinId), eq(role.key, key)));
  if (!r[0]) {
    throw new Error(`system role '${key}' not found — run db:seed:roles first`);
  }
  return r[0].id;
}

async function upsertVereinUserRole(
  db: Db,
  r: {
    vereinId: string;
    vereinUserId: string;
    roleId: string;
    mannschaftId: string | null;
    title: string;
  },
): Promise<void> {
  await db
    .insert(vereinUserRole)
    .values(r)
    .onConflictDoUpdate({
      target: [
        vereinUserRole.vereinUserId,
        vereinUserRole.roleId,
        vereinUserRole.mannschaftId,
      ],
      set: { title: r.title },
    });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
