import { eq } from "drizzle-orm";
import { getAdminDb } from "@commons-oss/db/internal";
import { schema } from "@commons-oss/db";
import { getConfig } from "../config.ts";
import type { AuthProvider, SignInResult } from "../types.ts";

/**
 * Dev-only auth: lists every `org_member` row in the DB and lets you click
 * one to "sign in" as that user inside that org. No credentials. Real
 * Logto in production via `LogtoProvider`.
 *
 * This exists so the shell + RLS chain is demonstrable end-to-end without
 * standing up a Logto container.
 *
 * The provider refuses to mint a session when `NODE_ENV === 'production'` —
 * see `route-handlers.ts`. Defense-in-depth: the picker page is also gated.
 */
export class StubProvider implements AuthProvider {
  readonly kind = "stub" as const;

  async beginSignIn(_req: Request): Promise<Response> {
    if (process.env.NODE_ENV === "production") {
      return new Response("Stub auth is disabled in production", { status: 403 });
    }

    const rows = await this.listMembershipChoices();
    const html = renderPickerPage(rows);
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  async handleCallback(req: Request): Promise<SignInResult> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Stub auth is disabled in production");
    }

    const form = await req.formData();
    const userId = formString(form.get("userId"));
    const orgId = formString(form.get("orgId"));
    if (!userId || !orgId) {
      throw new Error("[stub-auth] callback missing userId or orgId");
    }

    const db = getAdminDb();
    const [hit] = await db
      .select({
        userId: schema.user.id,
        logtoSub: schema.user.logtoSub,
        defaultLocale: schema.user.defaultLocale,
        orgId: schema.org.id,
        orgSlug: schema.org.slug,
      })
      .from(schema.orgMember)
      .innerJoin(schema.user, eq(schema.user.id, schema.orgMember.userId))
      .innerJoin(schema.org, eq(schema.org.id, schema.orgMember.orgId))
      .where(eq(schema.orgMember.userId, userId));

    if (!hit || hit.orgId !== orgId) {
      throw new Error(`[stub-auth] no org_member row for user=${userId}, org=${orgId}`);
    }

    const cfg = getConfig();
    const now = Math.floor(Date.now() / 1000);
    return {
      session: {
        userId: hit.userId,
        logtoSub: hit.logtoSub,
        orgId: hit.orgId,
        orgSlug: hit.orgSlug,
        locale: hit.defaultLocale === "en" ? "en" : "de",
        iat: now,
        exp: now + cfg.AUTH_SESSION_TTL,
      },
      redirectTo: `/${hit.orgSlug}`,
    };
  }

  signOut(_req: Request): Promise<{ redirectTo: string }> {
    return Promise.resolve({ redirectTo: "/" });
  }

  private async listMembershipChoices(): Promise<MembershipChoice[]> {
    const db = getAdminDb();
    const rows = await db
      .select({
        userId: schema.user.id,
        email: schema.user.email,
        orgId: schema.org.id,
        orgName: schema.org.name,
        orgSlug: schema.org.slug,
      })
      .from(schema.orgMember)
      .innerJoin(schema.user, eq(schema.user.id, schema.orgMember.userId))
      .innerJoin(schema.org, eq(schema.org.id, schema.orgMember.orgId))
      .where(eq(schema.orgMember.status, "active"));

    return rows;
  }
}

interface MembershipChoice {
  userId: string;
  email: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
}

function renderPickerPage(rows: MembershipChoice[]): string {
  const items =
    rows.length === 0
      ? `<p>No <code>org_member</code> rows found. Run <code>pnpm db:seed</code>.</p>`
      : rows
          .map(
            (r) => `
            <form method="POST" action="/api/auth/callback" class="row">
              <input type="hidden" name="userId" value="${escapeHtml(r.userId)}" />
              <input type="hidden" name="orgId" value="${escapeHtml(r.orgId)}" />
              <button type="submit">
                <strong>${escapeHtml(r.email)}</strong>
                <span>→ ${escapeHtml(r.orgName)} (${escapeHtml(r.orgSlug)})</span>
              </button>
            </form>`,
          )
          .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Commons OSS — dev sign-in</title>
  <style>
    body { font: 14px/1.5 system-ui, sans-serif; max-width: 640px; margin: 4rem auto; padding: 0 1rem; color: #111; }
    h1 { font-size: 1.25rem; margin-bottom: .25rem; }
    .hint { color: #555; margin: 0 0 2rem; }
    .row button { display: flex; gap: .75rem; align-items: baseline; width: 100%; padding: .75rem 1rem; margin: 0 0 .5rem; background: #fff; border: 1px solid #ccc; border-radius: 6px; text-align: left; cursor: pointer; font: inherit; }
    .row button:hover { background: #f4f4f4; }
    .row span { color: #555; font-size: .9em; }
    code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Commons OSS — dev sign-in</h1>
  <p class="hint">Stub auth is enabled (no <code>LOGTO_*</code> env). Pick an identity to sign in as.</p>
  ${items}
</body>
</html>`;
}

function formString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
