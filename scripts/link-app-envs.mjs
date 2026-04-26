#!/usr/bin/env node
// Symlink the workspace-root .env.local into each app dir so Next.js
// (which only reads env files from its own CWD) sees the same config
// the root db:migrate / db:seed scripts use. No-op when .env.local
// doesn't exist (e.g. CI), so safe to run from postinstall.

import { existsSync, lstatSync, symlinkSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, ".env.local");

if (!existsSync(source)) {
  process.exit(0);
}

const apps = ["apps/shell"];
for (const app of apps) {
  const target = path.join(root, app, ".env.local");
  // Skip if a real file already lives there (don't clobber bespoke per-app envs).
  if (existsSync(target) && !lstatSync(target).isSymbolicLink()) continue;
  if (existsSync(target)) unlinkSync(target);
  symlinkSync(path.relative(path.dirname(target), source), target);
}
