import { hasLogtoConfig } from "./config.ts";
import { LogtoProvider } from "./providers/logto.ts";
import { StubProvider } from "./providers/stub.ts";
import type { AuthProvider } from "./types.ts";

let cached: AuthProvider | undefined;

/**
 * Pick a provider based on env. Cached for the process lifetime — providers
 * are stateless apart from their config.
 *
 * Selection rules:
 *   - All three `LOGTO_*` env vars set → `LogtoProvider`
 *   - Otherwise → `StubProvider` (with a one-time console.warn outside test/dev)
 *
 * Production deploys MUST set the LOGTO_* vars; the StubProvider refuses to
 * mint sessions when `NODE_ENV === 'production'`.
 */
export function getProvider(): AuthProvider {
  if (cached) return cached;
  if (hasLogtoConfig()) {
    cached = new LogtoProvider();
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[@commons-oss/auth] No LOGTO_* env vars set and NODE_ENV=production. Set Logto config or remove the prod gate explicitly.",
      );
    }
    if (process.env.NODE_ENV !== "test") {
      console.warn("[@commons-oss/auth] LOGTO_* env not set — using StubProvider (dev only).");
    }
    cached = new StubProvider();
  }
  return cached;
}

/** Test-only — reset the cached provider so subsequent reads pick up new env. */
export function resetProviderForTests(): void {
  cached = undefined;
}
