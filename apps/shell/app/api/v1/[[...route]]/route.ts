import { OpenAPIHono } from "@hono/zod-openapi";
import { handle } from "hono/vercel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Single Hono app mounted at `/api/v1/*`. Phase 1 ships only `/health`;
 * each module's router will be mounted at `/api/v1/<moduleId>` once the
 * module registry exposes its `api.routes` (Hono router instance).
 *
 * OpenAPI spec is served at `/api/v1/openapi.json` for documentation +
 * future SDK gen (plan §13).
 */
const app = new OpenAPIHono().basePath("/api/v1");

app.get("/health", (c) => c.json({ status: "ok", ts: new Date().toISOString() }));

app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: { title: "Commons API", version: "0.1.0" },
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
