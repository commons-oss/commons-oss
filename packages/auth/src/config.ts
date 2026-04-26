import { z } from "zod";

/**
 * Auth env contract. Reads on first access; throws with a friendly message
 * if a required var is missing or malformed. Caller dictates which provider
 * is in use; the schema only validates the vars that provider needs.
 */
const envSchema = z.object({
  /** Required for cookie signing. Must be ≥ 32 bytes (256-bit HS256 key). */
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters (256-bit HS256 key)"),

  /** Public origin used to build absolute callback URLs. */
  AUTH_ORIGIN: z.string().url().default("http://localhost:3000"),

  /** Cookie name. Stable default; override only if hosting multiple shells on the same apex. */
  AUTH_COOKIE_NAME: z.string().default("commons.session"),

  /** Cookie max-age in seconds. Default 7 days. */
  AUTH_SESSION_TTL: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 7),

  /** Logto vars — only required when provider = 'logto'. */
  LOGTO_ENDPOINT: z.string().url().optional(),
  LOGTO_APP_ID: z.string().optional(),
  LOGTO_APP_SECRET: z.string().optional(),
});

export type AuthConfig = z.infer<typeof envSchema>;

let cached: AuthConfig | undefined;

export function getConfig(): AuthConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `[@commons-oss/auth] invalid env:\n${issues}\n\nSee .env.example for required variables.`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** Test-only — reset the cached config so subsequent reads pick up new env. */
export function resetConfigForTests(): void {
  cached = undefined;
}

export function hasLogtoConfig(cfg: AuthConfig = getConfig()): boolean {
  return Boolean(cfg.LOGTO_ENDPOINT && cfg.LOGTO_APP_ID && cfg.LOGTO_APP_SECRET);
}
