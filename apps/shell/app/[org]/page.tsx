import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { schema, withTenant } from "@commons-oss/db";
import { requireSession } from "~/src/ctx";

interface Props {
  params: Promise<{ org: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Phase 1 placeholder dashboard. Demonstrates the read path:
 *   session → withTenant → RLS-scoped query.
 *
 * The query selects from `org` filtered by id; under RLS this returns
 * the row only because `app.current_org` GUC matches. With a missing GUC
 * the same query returns 0 rows — that's the floor.
 */
export default async function OrgDashboard({ params }: Props) {
  const { org } = await params;
  const session = await requireSession(org);
  const locale = (await getLocale()) as "de" | "en";
  const t = await getTranslations("shell");

  const rows = await withTenant(
    { org: { id: session.orgId }, user: { id: session.userId } },
    (db) =>
      db
        .select({ id: schema.org.id, name: schema.org.name, slug: schema.org.slug })
        .from(schema.org)
        .where(eq(schema.org.id, session.orgId)),
  );

  const o = rows[0];
  const displayName =
    (o?.name as Record<string, string> | undefined)?.[locale] ??
    (o?.name as Record<string, string> | undefined)?.de ??
    t("unknownOrg");

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{displayName}</h1>
      <p style={{ color: "#666" }}>
        {t.rich("signedInAs", {
          sub: session.logtoSub,
          slug: o?.slug ?? "",
          code: (chunks) => <code>{chunks}</code>,
        })}
      </p>
      <p style={{ color: "#999", fontSize: 12 }}>
        {t.rich("phasePlaceholder", {
          code: (chunks) => <code>{chunks}</code>,
        })}
      </p>
    </div>
  );
}
