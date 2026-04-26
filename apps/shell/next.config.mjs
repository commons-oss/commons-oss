import createNextIntlPlugin from "next-intl/plugin";

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
