CREATE TYPE "public"."team_kind" AS ENUM('first', 'reserve', 'youth', 'other');--> statement-breakpoint
CREATE TYPE "public"."guardian_relation" AS ENUM('mother', 'father', 'guardian', 'other');--> statement-breakpoint
CREATE TYPE "public"."person_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."team_membership_kind" AS ENUM('player', 'staff');--> statement-breakpoint
CREATE TYPE "public"."role_scope" AS ENUM('org', 'team');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target_table" text NOT NULL,
	"target_id" text NOT NULL,
	"diff" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "partner_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"partner_org_id" uuid,
	"partner_external_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_team_exactly_one" CHECK (("partner_team"."partner_org_id" IS NOT NULL)::int + ("partner_team"."partner_external_id" IS NOT NULL)::int = 1)
);
--> statement-breakpoint
ALTER TABLE "partner_team" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"section" text DEFAULT 'football' NOT NULL,
	"kind" "team_kind" DEFAULT 'other' NOT NULL,
	"is_partnership" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_name_per_tenant" UNIQUE("org_id","name")
);
--> statement-breakpoint
ALTER TABLE "team" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"born_on" date,
	"jersey_number" integer,
	"photo_url" text,
	"notes" text,
	"status" "person_status" DEFAULT 'active' NOT NULL,
	"attribution_org_id" uuid,
	"attribution_external_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_attribution_at_most_one" CHECK (("person"."attribution_org_id" IS NOT NULL)::int + ("person"."attribution_external_id" IS NOT NULL)::int <= 1)
);
--> statement-breakpoint
ALTER TABLE "person" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "person_guardian" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"guardian_person_id" uuid NOT NULL,
	"child_person_id" uuid NOT NULL,
	"relation" "guardian_relation" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_guardian_unique" UNIQUE("guardian_person_id","child_person_id"),
	CONSTRAINT "person_guardian_no_self" CHECK ("person_guardian"."guardian_person_id" <> "person_guardian"."child_person_id")
);
--> statement-breakpoint
ALTER TABLE "person_guardian" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "team_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"kind" "team_membership_kind" DEFAULT 'player' NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_membership_unique" UNIQUE("team_id","person_id","kind")
);
--> statement-breakpoint
ALTER TABLE "team_membership" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "member_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"team_id" uuid,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_role_unique" UNIQUE("member_id","role_id","team_id")
);
--> statement-breakpoint
ALTER TABLE "member_role" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"key" text NOT NULL,
	"name" jsonb NOT NULL,
	"scope" "role_scope" NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_key_per_scope" UNIQUE("org_id","key"),
	CONSTRAINT "role_system_implies_null_org" CHECK (("role"."is_system" = false) OR ("role"."org_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "role" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "role_permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"role_id" uuid NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permission_unique" UNIQUE("role_id","permission")
);
--> statement-breakpoint
ALTER TABLE "role_permission" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_member_unique" UNIQUE("org_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "org_member" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "person_user_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_user_link_person_unique" UNIQUE("org_id","person_id"),
	CONSTRAINT "person_user_link_user_unique" UNIQUE("org_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "person_user_link" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logto_sub" text NOT NULL,
	"email" text NOT NULL,
	"default_locale" text DEFAULT 'de' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_logto_sub_unique" UNIQUE("logto_sub"),
	CONSTRAINT "user_locale_check" CHECK ("user"."default_locale" in ('de','en'))
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "external_org" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"notes" text,
	"promoted_to_org_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_org_name_per_tenant" UNIQUE("org_id","name")
);
--> statement-breakpoint
ALTER TABLE "external_org" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"locale_default" text DEFAULT 'de' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_slug_unique" UNIQUE("slug"),
	CONSTRAINT "org_locale_check" CHECK ("org"."locale_default" in ('de','en'))
);
--> statement-breakpoint
ALTER TABLE "org" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_team" ADD CONSTRAINT "partner_team_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_team" ADD CONSTRAINT "partner_team_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_team" ADD CONSTRAINT "partner_team_partner_org_id_org_id_fk" FOREIGN KEY ("partner_org_id") REFERENCES "public"."org"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_team" ADD CONSTRAINT "partner_team_partner_external_id_external_org_id_fk" FOREIGN KEY ("partner_external_id") REFERENCES "public"."external_org"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_attribution_org_id_org_id_fk" FOREIGN KEY ("attribution_org_id") REFERENCES "public"."org"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_attribution_external_id_external_org_id_fk" FOREIGN KEY ("attribution_external_id") REFERENCES "public"."external_org"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_guardian" ADD CONSTRAINT "person_guardian_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_guardian" ADD CONSTRAINT "person_guardian_guardian_person_id_person_id_fk" FOREIGN KEY ("guardian_person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_guardian" ADD CONSTRAINT "person_guardian_child_person_id_person_id_fk" FOREIGN KEY ("child_person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_member_id_org_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."org_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_member" ADD CONSTRAINT "org_member_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_member" ADD CONSTRAINT "org_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_user_link" ADD CONSTRAINT "person_user_link_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_user_link" ADD CONSTRAINT "person_user_link_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_user_link" ADD CONSTRAINT "person_user_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_org" ADD CONSTRAINT "external_org_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_org" ADD CONSTRAINT "external_org_promoted_to_org_id_org_id_fk" FOREIGN KEY ("promoted_to_org_id") REFERENCES "public"."org"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "audit_log_tenant" ON "audit_log" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "partner_team_tenant" ON "partner_team" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "team_tenant" ON "team" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "person_tenant" ON "person" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "person_guardian_tenant" ON "person_guardian" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "team_membership_tenant" ON "team_membership" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "member_role_tenant" ON "member_role" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "role_tenant_or_system" ON "role" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id IS NULL OR org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id IS NULL OR org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "role_permission_tenant_or_system" ON "role_permission" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id IS NULL OR org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id IS NULL OR org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "org_member_tenant" ON "org_member" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "person_user_link_tenant" ON "person_user_link" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "user_via_org" ON "user" AS PERMISSIVE FOR ALL TO "commons_app" USING (EXISTS (
        SELECT 1 FROM org_member om
        WHERE om.user_id = id
        AND om.org_id = current_setting('app.current_org', true)::uuid
      )) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "external_org_tenant" ON "external_org" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "org_self" ON "org" AS PERMISSIVE FOR ALL TO "commons_app" USING (id = current_setting('app.current_org', true)::uuid) WITH CHECK (id = current_setting('app.current_org', true)::uuid);