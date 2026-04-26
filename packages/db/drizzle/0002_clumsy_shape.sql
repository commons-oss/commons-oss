-- Dedupe rows with team_id IS NULL that the old NULLS DISTINCT constraint
-- let through on every reseed. Keep the earliest row per (member, role).
DELETE FROM "member_role" a
USING "member_role" b
WHERE a.team_id IS NULL
  AND b.team_id IS NULL
  AND a.member_id = b.member_id
  AND a.role_id = b.role_id
  AND a.created_at > b.created_at;
--> statement-breakpoint
ALTER TABLE "member_role" DROP CONSTRAINT "member_role_unique";--> statement-breakpoint
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_unique" UNIQUE NULLS NOT DISTINCT("member_id","role_id","team_id");