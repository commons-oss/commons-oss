import { and, eq } from 'drizzle-orm';
import { getDb } from '@commons-oss/db/internal';
import { schema } from '@commons-oss/db';

/**
 * Auth provisioning runs BEFORE we know which org the caller belongs to.
 * It uses the unscoped DB handle (RLS bypassed via the `commons_admin` role
 * is NOT used here — we still run as `commons_app`, but the `user` table's
 * `user_via_org` policy lets the row be inserted/queried by external sub).
 *
 * Reality check: the `user_via_org` policy filters by an `EXISTS` against
 * `org_member.org_id = current_org`. Without a current_org GUC the EXISTS
 * is empty, so the policy denies. For Phase 1, provisioning runs as
 * `commons_admin` via getDb() pointing at DATABASE_URL_ADMIN — explicit
 * cross-tenant operation by design.
 *
 * Phase 1.5 will revisit: the cleanest model is a SECURITY DEFINER function
 * `auth_resolve(logto_sub)` that runs in a single transaction and returns
 * (userId, orgIds[]) without ever exposing an admin handle to the app.
 */
export interface ResolvedIdentity {
  userId: string;
  logtoSub: string;
  orgMemberships: ReadonlyArray<{ orgId: string; orgSlug: string; orgName: string }>;
}

/**
 * Look up or create the user row for `logtoSub`, then list every org the
 * user is a member of. Throws if the user has zero memberships — at v1 a
 * user without an `org_member` row can't sign in (no self-serve org
 * creation yet; that's a Phase 4 onboarding flow).
 */
export async function resolveIdentity(input: {
  logtoSub: string;
  email: string;
  defaultLocale?: 'de' | 'en';
}): Promise<ResolvedIdentity> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.logtoSub, input.logtoSub));

  const userRow =
    existing ??
    (
      await db
        .insert(schema.user)
        .values({
          logtoSub: input.logtoSub,
          email: input.email,
          defaultLocale: input.defaultLocale ?? 'de',
        })
        .returning()
    )[0];

  if (!userRow) {
    throw new Error(`[auth] failed to provision user for sub=${input.logtoSub}`);
  }

  const memberships = await db
    .select({
      orgId: schema.orgMember.orgId,
      orgSlug: schema.org.slug,
      orgName: schema.org.name,
      status: schema.orgMember.status,
    })
    .from(schema.orgMember)
    .innerJoin(schema.org, eq(schema.org.id, schema.orgMember.orgId))
    .where(
      and(
        eq(schema.orgMember.userId, userRow.id),
        eq(schema.orgMember.status, 'active'),
      ),
    );

  if (memberships.length === 0) {
    throw new Error(
      `[auth] user ${userRow.id} (sub=${input.logtoSub}) has no active org memberships. ` +
        `Phase 1 has no self-serve onboarding; an admin must create an org_member row first.`,
    );
  }

  return {
    userId: userRow.id,
    logtoSub: userRow.logtoSub,
    orgMemberships: memberships.map((m) => ({
      orgId: m.orgId,
      orgSlug: m.orgSlug,
      orgName: m.orgName,
    })),
  };
}

/**
 * Pick the active org for the new session. Today: first membership wins.
 * Future: respect a "last selected" preference, ?org= query param, etc.
 */
export function pickActiveOrg(
  memberships: ResolvedIdentity['orgMemberships'],
  preferredId?: string,
): { orgId: string; orgSlug: string } {
  if (preferredId) {
    const hit = memberships.find((m) => m.orgId === preferredId);
    if (hit) return hit;
  }
  const first = memberships[0];
  if (!first) throw new Error('[auth] pickActiveOrg called with empty memberships');
  return { orgId: first.orgId, orgSlug: first.orgSlug };
}
