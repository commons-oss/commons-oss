import { fileURLToPath } from "node:url";
import path from "node:path";
import nextEnv from "@next/env";
import createNextIntlPlugin from "next-intl/plugin";

// Load .env files from the workspace root so the shell shares one env
// file with db:migrate / db:seed scripts run from the repo root.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../..");
nextEnv.loadEnvConfig(workspaceRoot);

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages are TypeScript source — Next compiles them.
  transpilePackages: ["@commons-oss/auth", "@commons-oss/db", "@commons-oss/module"],
  // postgres-js + drizzle ship as ESM/CJS hybrids; mark them external on the
  // server build so Next doesn't try to bundle node_modules into the RSC payload.
  serverExternalPackages: ["postgres", "drizzle-orm"],
};

export default withNextIntl(nextConfig);
