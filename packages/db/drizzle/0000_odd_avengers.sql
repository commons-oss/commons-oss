CREATE TYPE "public"."mannschaft_kind" AS ENUM('kampfmannschaft', 'reserve', 'nachwuchs', 'sonstige');--> statement-breakpoint
CREATE TYPE "public"."guardian_relation" AS ENUM('mother', 'father', 'guardian', 'other');--> statement-breakpoint
CREATE TYPE "public"."mannschaft_membership_kind" AS ENUM('player', 'staff');--> statement-breakpoint
CREATE TYPE "public"."person_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."role_scope" AS ENUM('verein', 'mannschaft');--> statement-breakpoint
CREATE TYPE "public"."verein_user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verein_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target_table" text NOT NULL,
	"target_id" text NOT NULL,
	"diff" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mannschaft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verein_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sektion" text DEFAULT 'fussball' NOT NULL,
	"kind" "mannschaft_kind" DEFAULT 'sonstige' NOT NULL,
	"is_sg" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mannschaft_name_per_tenant" UNIQUE("verein_id","name")
);
--> statement-breakpoint
ALTER TABLE "mannschaft" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mannschaft_partner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verein_id" uuid NOT NULL,
	"mannschaft_id" uuid NOT NULL,
	"partner_verein_id" uuid,
	"partner_external_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mannschaft_partner_exactly_one" CHECK (("mannschaft_partner"."partner_verein_id" IS NOT NULL)::int + ("mannschaft_partner"."partner_external_id" IS NOT NULL)::int = 1)
);
--> statement-breakpoint
ALTER TABLE "mannschaft_partner" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mannschaft_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verein_id" uuid NOT NULL,
	"mannschaft_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"kind" "mannschaft_membership_kind" DEFAULT 'player' NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mannschaft_membership_unique" UNIQUE("mannschaft_id","person_id","kind")
);
--> statement-breakpoint
ALTER TABLE "mannschaft_membership" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verein_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"born_on" date,
	"jersey_number" integer,
	"photo_url" text,
	"notes" text,
	"status" "person_status" DEFAULT 'active' NOT NULL,
	"attribution_verein_id" uuid,
	"attribution_external_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_attribution_at_most_one" CHECK (("person"."attribution_verein_id" IS NOT NULL)::int + ("person"."attribution_external_id" IS NOT NULL)::int <= 1)
);
--> statement-breakpoint
ALTER TABLE "person" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "person_guardian" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verein_id" uuid NOT NULL,
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
CREATE TABLE "role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verein_id" uuid,
	"key" text NOT NULL,
	"name" jsonb NOT NULL,
	"scope" "role_scope" NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_key_per_scope" UNIQUE("verein_id","key"),
	CONSTRAINT "role_system_implies_null_verein" CHECK (("role"."is_system" = false) OR ("role"."verein_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "role" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "role_permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verein_id" uuid,
	"role_id" uuid NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permission_unique" UNIQUE("role_id","permission")
);
--> statement-breakpoint
ALTER TABLE "role_permission" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verein_user_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verein_id" uuid NOT NULL,
	"verein_user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"mannschaft_id" uuid,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verein_user_role_unique" UNIQUE("verein_user_id","role_id","mannschaft_id")
);
--> statement-breakpoint
ALTER TABLE "verein_user_role" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "person_user_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verein_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_user_link_person_unique" UNIQUE("verein_id","person_id"),
	CONSTRAINT "person_user_link_user_unique" UNIQUE("verein_id","user_id")
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
CREATE TABLE "verein_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verein_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "verein_user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verein_user_unique" UNIQUE("verein_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "verein_user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "external_verein" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verein_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"notes" text,
	"promoted_to_verein_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_verein_name_per_tenant" UNIQUE("verein_id","name")
);
--> statement-breakpoint
ALTER TABLE "external_verein" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verein" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"locale_default" text DEFAULT 'de' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verein_slug_unique" UNIQUE("slug"),
	CONSTRAINT "verein_locale_check" CHECK ("verein"."locale_default" in ('de','en'))
);
--> statement-breakpoint
ALTER TABLE "verein" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_verein_id_verein_id_fk" FOREIGN KEY ("verein_id") REFERENCES "public"."verein"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mannschaft" ADD CONSTRAINT "mannschaft_verein_id_verein_id_fk" FOREIGN KEY ("verein_id") REFERENCES "public"."verein"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mannschaft_partner" ADD CONSTRAINT "mannschaft_partner_verein_id_verein_id_fk" FOREIGN KEY ("verein_id") REFERENCES "public"."verein"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mannschaft_partner" ADD CONSTRAINT "mannschaft_partner_mannschaft_id_mannschaft_id_fk" FOREIGN KEY ("mannschaft_id") REFERENCES "public"."mannschaft"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mannschaft_partner" ADD CONSTRAINT "mannschaft_partner_partner_verein_id_verein_id_fk" FOREIGN KEY ("partner_verein_id") REFERENCES "public"."verein"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mannschaft_partner" ADD CONSTRAINT "mannschaft_partner_partner_external_id_external_verein_id_fk" FOREIGN KEY ("partner_external_id") REFERENCES "public"."external_verein"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mannschaft_membership" ADD CONSTRAINT "mannschaft_membership_verein_id_verein_id_fk" FOREIGN KEY ("verein_id") REFERENCES "public"."verein"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mannschaft_membership" ADD CONSTRAINT "mannschaft_membership_mannschaft_id_mannschaft_id_fk" FOREIGN KEY ("mannschaft_id") REFERENCES "public"."mannschaft"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mannschaft_membership" ADD CONSTRAINT "mannschaft_membership_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_verein_id_verein_id_fk" FOREIGN KEY ("verein_id") REFERENCES "public"."verein"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_attribution_verein_id_verein_id_fk" FOREIGN KEY ("attribution_verein_id") REFERENCES "public"."verein"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_attribution_external_id_external_verein_id_fk" FOREIGN KEY ("attribution_external_id") REFERENCES "public"."external_verein"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_guardian" ADD CONSTRAINT "person_guardian_verein_id_verein_id_fk" FOREIGN KEY ("verein_id") REFERENCES "public"."verein"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_guardian" ADD CONSTRAINT "person_guardian_guardian_person_id_person_id_fk" FOREIGN KEY ("guardian_person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_guardian" ADD CONSTRAINT "person_guardian_child_person_id_person_id_fk" FOREIGN KEY ("child_person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_verein_id_verein_id_fk" FOREIGN KEY ("verein_id") REFERENCES "public"."verein"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_verein_id_verein_id_fk" FOREIGN KEY ("verein_id") REFERENCES "public"."verein"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verein_user_role" ADD CONSTRAINT "verein_user_role_verein_id_verein_id_fk" FOREIGN KEY ("verein_id") REFERENCES "public"."verein"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verein_user_role" ADD CONSTRAINT "verein_user_role_verein_user_id_verein_user_id_fk" FOREIGN KEY ("verein_user_id") REFERENCES "public"."verein_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verein_user_role" ADD CONSTRAINT "verein_user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verein_user_role" ADD CONSTRAINT "verein_user_role_mannschaft_id_mannschaft_id_fk" FOREIGN KEY ("mannschaft_id") REFERENCES "public"."mannschaft"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_user_link" ADD CONSTRAINT "person_user_link_verein_id_verein_id_fk" FOREIGN KEY ("verein_id") REFERENCES "public"."verein"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_user_link" ADD CONSTRAINT "person_user_link_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_user_link" ADD CONSTRAINT "person_user_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verein_user" ADD CONSTRAINT "verein_user_verein_id_verein_id_fk" FOREIGN KEY ("verein_id") REFERENCES "public"."verein"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verein_user" ADD CONSTRAINT "verein_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_verein" ADD CONSTRAINT "external_verein_verein_id_verein_id_fk" FOREIGN KEY ("verein_id") REFERENCES "public"."verein"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_verein" ADD CONSTRAINT "external_verein_promoted_to_verein_id_verein_id_fk" FOREIGN KEY ("promoted_to_verein_id") REFERENCES "public"."verein"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "audit_log_tenant" ON "audit_log" AS PERMISSIVE FOR ALL TO "commons_app" USING (verein_id = current_setting('app.current_verein', true)::uuid) WITH CHECK (verein_id = current_setting('app.current_verein', true)::uuid);--> statement-breakpoint
CREATE POLICY "mannschaft_tenant" ON "mannschaft" AS PERMISSIVE FOR ALL TO "commons_app" USING (verein_id = current_setting('app.current_verein', true)::uuid) WITH CHECK (verein_id = current_setting('app.current_verein', true)::uuid);--> statement-breakpoint
CREATE POLICY "mannschaft_partner_tenant" ON "mannschaft_partner" AS PERMISSIVE FOR ALL TO "commons_app" USING (verein_id = current_setting('app.current_verein', true)::uuid) WITH CHECK (verein_id = current_setting('app.current_verein', true)::uuid);--> statement-breakpoint
CREATE POLICY "mannschaft_membership_tenant" ON "mannschaft_membership" AS PERMISSIVE FOR ALL TO "commons_app" USING (verein_id = current_setting('app.current_verein', true)::uuid) WITH CHECK (verein_id = current_setting('app.current_verein', true)::uuid);--> statement-breakpoint
CREATE POLICY "person_tenant" ON "person" AS PERMISSIVE FOR ALL TO "commons_app" USING (verein_id = current_setting('app.current_verein', true)::uuid) WITH CHECK (verein_id = current_setting('app.current_verein', true)::uuid);--> statement-breakpoint
CREATE POLICY "person_guardian_tenant" ON "person_guardian" AS PERMISSIVE FOR ALL TO "commons_app" USING (verein_id = current_setting('app.current_verein', true)::uuid) WITH CHECK (verein_id = current_setting('app.current_verein', true)::uuid);--> statement-breakpoint
CREATE POLICY "role_tenant_or_system" ON "role" AS PERMISSIVE FOR ALL TO "commons_app" USING (verein_id IS NULL OR verein_id = current_setting('app.current_verein', true)::uuid) WITH CHECK (verein_id IS NULL OR verein_id = current_setting('app.current_verein', true)::uuid);--> statement-breakpoint
CREATE POLICY "role_permission_tenant_or_system" ON "role_permission" AS PERMISSIVE FOR ALL TO "commons_app" USING (verein_id IS NULL OR verein_id = current_setting('app.current_verein', true)::uuid) WITH CHECK (verein_id IS NULL OR verein_id = current_setting('app.current_verein', true)::uuid);--> statement-breakpoint
CREATE POLICY "verein_user_role_tenant" ON "verein_user_role" AS PERMISSIVE FOR ALL TO "commons_app" USING (verein_id = current_setting('app.current_verein', true)::uuid) WITH CHECK (verein_id = current_setting('app.current_verein', true)::uuid);--> statement-breakpoint
CREATE POLICY "person_user_link_tenant" ON "person_user_link" AS PERMISSIVE FOR ALL TO "commons_app" USING (verein_id = current_setting('app.current_verein', true)::uuid) WITH CHECK (verein_id = current_setting('app.current_verein', true)::uuid);--> statement-breakpoint
CREATE POLICY "user_via_verein" ON "user" AS PERMISSIVE FOR ALL TO "commons_app" USING (EXISTS (
        SELECT 1 FROM verein_user vu
        WHERE vu.user_id = id
        AND vu.verein_id = current_setting('app.current_verein', true)::uuid
      )) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "verein_user_tenant" ON "verein_user" AS PERMISSIVE FOR ALL TO "commons_app" USING (verein_id = current_setting('app.current_verein', true)::uuid) WITH CHECK (verein_id = current_setting('app.current_verein', true)::uuid);--> statement-breakpoint
CREATE POLICY "external_verein_tenant" ON "external_verein" AS PERMISSIVE FOR ALL TO "commons_app" USING (verein_id = current_setting('app.current_verein', true)::uuid) WITH CHECK (verein_id = current_setting('app.current_verein', true)::uuid);--> statement-breakpoint
CREATE POLICY "verein_self" ON "verein" AS PERMISSIVE FOR ALL TO "commons_app" USING (id = current_setting('app.current_verein', true)::uuid) WITH CHECK (id = current_setting('app.current_verein', true)::uuid);