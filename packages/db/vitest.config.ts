import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    // Tests need a live Postgres. CI sets DATABASE_URL_ADMIN itself; locally
    // we expect the user to have run `docker compose up -d` and `pnpm db:push`.
  },
});
