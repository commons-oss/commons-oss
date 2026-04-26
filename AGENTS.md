# Agent handover

This repo follows the [AGENTS.md convention](https://agents.md). The
canonical agent context — engineering rules, RLS contract, commit
conventions, brand handover — lives in [`CLAUDE.md`](./CLAUDE.md). It is
written for Claude Code but applies to any AI coding agent.

If you are an agent picking up work here:

1. Read `CLAUDE.md` first.
2. Read `projects/commons-oss/plans/monorepo-module-architecture.md` in
   the `~/brain/` repo for the full architecture (or ask the user to
   share it). Treat that plan as the source of truth.
3. Skim `BRAND.md` before touching any visible surface.
4. Do not add `Co-Authored-By:` trailers to commits.
