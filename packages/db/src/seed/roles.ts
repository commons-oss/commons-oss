import { sql } from 'drizzle-orm';
import { getAdminDb } from './_admin-db.ts';
import { role, rolePermission } from '../schema/role.ts';

/**
 * System role + permission seed. Idempotent — safe to re-run.
 * Per §8: roles drive authz, titles are descriptive metadata only.
 */
const SYSTEM_ROLES: Array<{
  key: string;
  name: { de: string; en: string };
  scope: 'verein' | 'mannschaft';
  permissions: string[];
}> = [
  {
    key: 'vereinsadmin',
    name: { de: 'Vereinsadmin', en: 'Club admin' },
    scope: 'verein',
    permissions: ['*.admin', '*.read', '*.write'],
  },
  {
    key: 'funktionaer',
    name: { de: 'Funktionär', en: 'Officer' },
    scope: 'verein',
    permissions: ['members.read', 'attendance.read'],
  },
  {
    key: 'trainer',
    name: { de: 'Trainer', en: 'Coach' },
    scope: 'mannschaft',
    permissions: ['attendance.record', 'attendance.read', 'members.read'],
  },
  {
    key: 'spieler',
    name: { de: 'Spieler', en: 'Player' },
    scope: 'mannschaft',
    permissions: ['attendance.read.self', 'members.read.self'],
  },
  {
    key: 'eltern',
    name: { de: 'Eltern', en: 'Parent' },
    scope: 'mannschaft',
    permissions: ['attendance.read.self', 'members.read.self'],
  },
  {
    key: 'readonly',
    name: { de: 'Nur lesen', en: 'Read-only' },
    scope: 'verein',
    permissions: ['*.read'],
  },
];

async function main(): Promise<void> {
  const { db, close } = getAdminDb();
  try {
    for (const r of SYSTEM_ROLES) {
      const inserted = await db
        .insert(role)
        .values({
          vereinId: null,
          key: r.key,
          name: r.name,
          scope: r.scope,
          isSystem: true,
        })
        .onConflictDoUpdate({
          target: [role.vereinId, role.key],
          set: { name: r.name, scope: r.scope, isSystem: true },
        })
        .returning({ id: role.id });

      const roleId = inserted[0]?.id;
      if (!roleId) throw new Error(`failed to upsert role ${r.key}`);

      // Replace permission set deterministically.
      await db.delete(rolePermission).where(sql`role_id = ${roleId}`);
      if (r.permissions.length > 0) {
        await db.insert(rolePermission).values(
          r.permissions.map((p) => ({
            vereinId: null,
            roleId,
            permission: p,
          })),
        );
      }
      console.log(`✓ role ${r.key} (${r.permissions.length} perms)`);
    }
    console.log('System roles seeded.');
  } finally {
    await close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
