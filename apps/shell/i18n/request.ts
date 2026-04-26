import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { decodeSession, getConfig } from "@commons-oss/auth";

/**
 * Locale resolution: read the session cookie, fall back to `de`.
 *
 * No URL-prefix routing — this is an admin app, locale follows the user's
 * `default_locale` (set on the user row, copied into the session at sign-in).
 * Switching locales re-mints the cookie; until then the same locale persists
 * across the session.
 */
export default getRequestConfig(async () => {
  const locale = await readLocaleFromSession();
  const mod = (await import(`../messages/${locale}.json`)) as {
    default: Record<string, unknown>;
  };
  return { locale, messages: mod.default };
});

async function readLocaleFromSession(): Promise<"de" | "en"> {
  const jar = await cookies();
  const token = jar.get(getConfig().AUTH_COOKIE_NAME)?.value;
  if (!token) return "de";
  const session = await decodeSession(token);
  return session?.locale ?? "de";
}
