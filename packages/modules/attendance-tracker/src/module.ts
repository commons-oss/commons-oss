import { defineModule } from "@commons-oss/module";
import * as schema from "../drizzle/schema.ts";
import de from "../messages/de.json" with { type: "json" };
import en from "../messages/en.json" with { type: "json" };

const ID = "attendance-tracker";

/**
 * Module catalogs (de/en) live as JSON next to the module so translators
 * can edit them without touching code. The shell merges each module's
 * `messages.{de,en}` into next-intl under namespace `<moduleId>` at boot.
 */
export const attendanceTracker = defineModule({
  id: ID,
  name: { de: "Anwesenheit", en: "Attendance" },
  version: "0.1.0",
  perms: [`${ID}.read`, `${ID}.write`, `${ID}.manage`] as const,
  routes: [
    { path: "today", scope: "org", perms: [`${ID}.read`] },
    { path: "sessions", scope: "org", perms: [`${ID}.read`] },
  ],
  nav: [
    {
      id: "today",
      label: { de: de.navToday, en: en.navToday },
      href: ({ orgSlug }) => `/${orgSlug}/today`,
      icon: "calendar-check",
      group: "main",
      order: 10,
      persona: "coach",
    },
    {
      id: "sessions",
      label: { de: de.navSessions, en: en.navSessions },
      href: ({ orgSlug }) => `/${orgSlug}/sessions`,
      icon: "history",
      group: "main",
      order: 20,
      persona: "coach",
    },
  ],
  api: { routes: {} },
  schema,
  messages: { de, en },
});
