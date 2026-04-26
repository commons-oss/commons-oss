export const colors = Object.freeze({
  slate: "#1f2937",
  forest: "#3f7050",
  forestBright: "#4a8a5f",
  mute: "#6b7280",
  border: "#e5e7eb",
  surface: "#ffffff",
  surfaceDark: "#1f2937",
});

export const typography = Object.freeze({
  primary: "Plus Jakarta Sans",
  fallback:
    "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  license: "OFL-1.1",
  source: "https://github.com/tokotype/PlusJakartaSans",
});

export const wordmark = Object.freeze({
  text: "Commons OSS",
  case: "title",
  ossColor: "#6b7280",
});

/*
 * UI status tokens (NOT brand tokens). Use for semantic state:
 * ok = present, warn = excused, bad = absent.
 */
export const status = Object.freeze({
  ok: { light: "#3f7050", dark: "#4a8a5f" },
  warn: { light: "#b88516", dark: "#d4a04a" },
  bad: { light: "#a23a3a", dark: "#d97a7a" },
});
