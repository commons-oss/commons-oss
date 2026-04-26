import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { schema, withTenant } from "@commons-oss/db";
import { requireSession } from "~/src/ctx";

interface Props {
  params: Promise<{ org: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Profil — minimal Phase 1 surface. Identity, current org, locale (read-only),
 * sign-out. Mannschaft-Wechsel + Sprachumschalter + Theme ship in Phase 2 with
 * the team chooser (M4) and account-settings flow (§4 of plan).
 */
export default async function ProfilePage({ params }: Props) {
  const { org } = await params;
  const session = await requireSession(org);
  const t = await getTranslations("shell");

  const [me] = await withTenant(
    { org: { id: session.orgId }, user: { id: session.userId } },
    (db) =>
      db
        .select({
          email: schema.user.email,
          defaultLocale: schema.user.defaultLocale,
        })
        .from(schema.user)
        .where(eq(schema.user.id, session.userId))
        .limit(1),
  );

  const initials =
    (me?.email ?? session.logtoSub)
      .replace(/[^a-zA-Z]/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join("") || "?";

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ marginTop: 0, fontSize: 22, fontWeight: 500, letterSpacing: "-0.4px" }}>
        {t("profileTitle")}
      </h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 0",
          borderTop: "1px solid var(--brand-border)",
          borderBottom: "1px solid var(--brand-border)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: "#f3f4f6",
            border: "1px solid var(--brand-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 500,
            color: "var(--brand-slate)",
            flex: "none",
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "var(--brand-slate)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {me?.email ?? session.logtoSub}
          </div>
          <div style={{ fontSize: 13, color: "var(--brand-mute)", marginTop: 2 }}>
            {t("profileOrg")}: {session.orgSlug}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 0", borderBottom: "1px solid var(--brand-border)" }}>
        <div style={{ fontSize: 12, color: "var(--brand-mute)", marginBottom: 4 }}>
          {t("profileLocale")}
        </div>
        <div style={{ fontSize: 14, color: "var(--brand-slate)" }}>
          {(me?.defaultLocale ?? session.locale).toUpperCase()}
        </div>
        <div style={{ fontSize: 12, color: "var(--brand-mute)", marginTop: 4 }}>
          {t("profileLocaleHint")}
        </div>
      </div>

      <form action="/api/auth/sign-out" method="post" style={{ marginTop: 24 }}>
        <button
          type="submit"
          style={{
            width: "100%",
            height: 44,
            borderRadius: 8,
            background: "transparent",
            border: "1px solid var(--brand-border)",
            color: "var(--brand-slate)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {t("profileSignOut")}
        </button>
      </form>

      <div
        style={{
          textAlign: "center",
          marginTop: 20,
          fontSize: 11,
          color: "var(--brand-mute)",
        }}
      >
        {t("profileFooter")}
      </div>
    </div>
  );
}
