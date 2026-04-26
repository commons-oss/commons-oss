import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { requireSession } from "~/src/ctx";
import { getUserPersonas } from "~/src/personas";
import { registry } from "~/modules";
import { ChromeNav, type ChromeNavItem } from "./_components/chrome-nav.tsx";

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
 *   2. Render role+viewport-aware chrome (sidebar md+, bottom tab below)
 *      from registered modules' nav items, filtered by the user's personas.
 *
 * Profile is a shell built-in (always shown), trailing the module items.
 */
export default async function OrgLayout({ children, params }: Props) {
  const { org } = await params;
  const session = await requireSession(org);
  const locale = (await getLocale()) as "de" | "en";
  const t = await getTranslations("shell");
  const personas = await getUserPersonas(session.userId, session.orgId);

  const moduleItems = registry.modules
    .flatMap((m) => m.nav.map((n) => ({ ...n, moduleId: m.id })))
    .filter((n) => {
      const p = n.persona ?? "both";
      if (p === "both") return true;
      if (p === "coach") return personas.isCoach;
      if (p === "officer") return personas.isOfficer;
      return false;
    })
    .sort((a, b) => {
      const g = (a.group ?? "main").localeCompare(b.group ?? "main");
      if (g !== 0) return g;
      return (a.order ?? 0) - (b.order ?? 0);
    });

  const items: ChromeNavItem[] = moduleItems.map((n) => ({
    key: `${n.moduleId}:${n.id}`,
    label: n.label[locale] ?? n.label.de,
    href: n.href({ orgSlug: org }),
    icon: n.icon,
  }));
  items.push({
    key: "shell:profile",
    label: t("navProfile"),
    href: `/${org}/profile`,
    icon: "user",
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <ChromeNav orgSlug={org} appName={t("appName")} items={items} />
      <main className="commons-shell-main">{children}</main>
    </div>
  );
}
