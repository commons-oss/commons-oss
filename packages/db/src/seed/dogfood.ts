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
 * Dogfood seed. UFC Wettmannstätten as the operating Verein.
 * One SG (Spielgemeinschaft) Mannschaft (U13) with FC Eibiswald as
 * an external_verein partner — to prove the SG path end-to-end.
 *
 * Hans Müller as the multi-role example (Reserve player, U15 Trainer, Kassier).
 *
 * Idempotent — safe to re-run. Re-uses rows by natural keys.
 */

async function main(): Promise<void> {
  const { db, close } = getAdminDb();
  try {
    // 1. Operating Verein
    const ufc = await upsertVerein(db, {
      slug: 'ufc-wettmannstaetten',
      name: 'UFC Wettmannstätten',
    });

    // 2. External partner (FC Eibiswald — SG U13 partner, NOT on the platform)
    const eibiswald = await upsertExternalVerein(db, {
      vereinId: ufc.id,
      name: 'FC Eibiswald',
      contactEmail: 'office@fc-eibiswald.example',
    });

    // 3. Mannschaften
    const reserve = await upsertMannschaft(db, {
      vereinId: ufc.id,
      name: 'Reserve',
      kind: 'reserve',
    });
    const u15 = await upsertMannschaft(db, {
      vereinId: ufc.id,
      name: 'U15',
      kind: 'nachwuchs',
    });
    const u13Sg = await upsertMannschaft(db, {
      vereinId: ufc.id,
      name: 'U13 SG Wettmannstätten/Eibiswald',
      kind: 'nachwuchs',
      isSg: true,
    });

    // 4. SG partner record for the U13
    await upsertMannschaftPartner(db, {
      vereinId: ufc.id,
      mannschaftId: u13Sg.id,
      partnerExternalId: eibiswald.id,
    });

    // 5. People — Hans (Reserve player + U15 trainer) and one SG kid attributed to FC Eibiswald
    const hans = await upsertPerson(db, {
      vereinId: ufc.id,
      firstName: 'Hans',
      lastName: 'Müller',
      bornOn: '1992-04-12',
    });
    const lukas = await upsertPerson(db, {
      vereinId: ufc.id,
      firstName: 'Lukas',
      lastName: 'Schober',
      bornOn: '2012-08-03',
      attributionExternalId: eibiswald.id,
    });

    await upsertMembership(db, {
      vereinId: ufc.id,
      mannschaftId: reserve.id,
      personId: hans.id,
      kind: 'player',
    });
    await upsertMembership(db, {
      vereinId: ufc.id,
      mannschaftId: u15.id,
      personId: hans.id,
      kind: 'staff',
    });
    await upsertMembership(db, {
      vereinId: ufc.id,
      mannschaftId: u13Sg.id,
      personId: lukas.id,
      kind: 'player',
    });

    // 6. User + verein_user + multi-role
    const hansUser = await upsertUser(db, {
      logtoSub: 'dogfood|hans-mueller',
      email: 'hans.mueller@example.test',
    });
    const hansVu = await upsertVereinUser(db, {
      vereinId: ufc.id,
      userId: hansUser.id,
    });

    const trainerRoleId = await getSystemRoleId(db, 'trainer');
    const spielerRoleId = await getSystemRoleId(db, 'spieler');
    const funktionaerRoleId = await getSystemRoleId(db, 'funktionaer');

    await upsertVereinUserRole(db, {
      vereinId: ufc.id,
      vereinUserId: hansVu.id,
      roleId: spielerRoleId,
      mannschaftId: reserve.id,
      title: 'IV',
    });
    await upsertVereinUserRole(db, {
      vereinId: ufc.id,
      vereinUserId: hansVu.id,
      roleId: trainerRoleId,
      mannschaftId: u15.id,
      title: 'Cheftrainer',
    });
    await upsertVereinUserRole(db, {
      vereinId: ufc.id,
      vereinUserId: hansVu.id,
      roleId: funktionaerRoleId,
      mannschaftId: null,
      title: 'Kassier',
    });

    console.log('✓ dogfood seeded: UFC Wettmannstätten + 1 SG Mannschaft + Hans multi-role');
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
