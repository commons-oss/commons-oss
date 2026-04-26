import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

/**
 * Shared ESLint base for Commons OSS packages.
 * Strict TypeScript, prettier-friendly, no React/Next assumptions.
 *
 * Usage in a package: import baseConfig from '@commons-oss/config-eslint/base';
 *                      export default [...baseConfig, /* package-specific overrides * /];
 */
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.generated.*",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      // Closed-default RLS hardening: importing `@commons-oss/db/internal`
      // gets you the unscoped DB handle, bypassing `withTenant`. Allowed
      // only in places that genuinely run before tenant context exists
      // (auth callbacks, migrations, seeds). Override per-package when
      // that's actually the case.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@commons-oss/db/internal",
              message:
                "Use withTenant() from @commons-oss/db. /internal bypasses RLS — only auth callbacks, migrations, and seeds may import it (override this rule there).",
            },
          ],
        },
      ],
    },
  },
  {
    // The db package itself + seed scripts are allowed to reach into the
    // unscoped client. They need it to build withTenant in the first place.
    files: ["**/src/client.ts", "**/src/internal.ts", "**/src/migrate.ts", "**/src/seed/**"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
];
