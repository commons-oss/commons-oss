import type { ReactNode } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireSession } from "~/src/ctx";
import { registry } from "~/modules";

interface Props {
  children: ReactNode;
  params: Promise<{ org: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Tenant shell. Two jobs:
 *   1. Enforce session.orgSlug === [org] route param (redirect on mismatch).
 *      Defense-in-depth — RLS already returns 0 rows on a mismatch since
 *      `withTenant` is bound to session.orgId, not the URL slug.
 *   2. Render the sidebar from registered modules' nav items, sorted by
 *      group then order.
 */
export default async function OrgLayout({ children, params }: Props) {
  const { org } = await params;
  const session = await requireSession(org);
  const locale = (await getLocale()) as "de" | "en";
  const t = await getTranslations("shell");

  const navItems = registry.modules
    .flatMap((m) => m.nav.map((n) => ({ ...n, moduleId: m.id })))
    .sort((a, b) => {
      const g = (a.group ?? "main").localeCompare(b.group ?? "main");
      if (g !== 0) return g;
      return (a.order ?? 0) - (b.order ?? 0);
    });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 240, padding: 16, borderRight: "1px solid var(--brand-border)" }}>
        <div
          aria-label={t("appName")}
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
        >
          <svg width="24" height="24" viewBox="0 0 120 120" role="img" aria-hidden="true">
            <g transform="translate(60 60)">
              <circle cx="0" cy="-44" r="5" fill="var(--brand-slate)" />
              <circle cx="31.1" cy="-31.1" r="5" fill="var(--brand-slate)" />
              <circle cx="44" cy="0" r="5" fill="var(--brand-slate)" />
              <circle cx="31.1" cy="31.1" r="5" fill="var(--brand-slate)" />
              <circle cx="0" cy="44" r="5" fill="var(--brand-slate)" />
              <circle cx="-31.1" cy="31.1" r="5" fill="var(--brand-slate)" />
              <circle cx="-44" cy="0" r="5" fill="var(--brand-slate)" />
              <circle cx="-31.1" cy="-31.1" r="5" fill="var(--brand-slate)" />
              <circle cx="0" cy="0" r="7.5" fill="var(--brand-forest-bright)" />
            </g>
          </svg>
          <span style={{ fontWeight: 500, color: "var(--brand-slate)" }}>
            Commons <span style={{ color: "var(--brand-mute)", letterSpacing: "0.05em" }}>OSS</span>
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--brand-mute)", marginBottom: 16 }}>
          {session.orgSlug}
        </div>
        <nav>
          {navItems.length === 0 ? (
            <div style={{ fontSize: 12, color: "#999" }}>{t("noModules")}</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {navItems.map((n) => (
                <li key={`${n.moduleId}:${n.id}`}>
                  <Link href={n.href({ orgSlug: org })}>{n.label[locale] ?? n.label.de}</Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
