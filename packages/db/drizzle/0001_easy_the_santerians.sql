CREATE TYPE "public"."attendance_status" AS ENUM('present', 'excused', 'absent');--> statement-breakpoint
CREATE TYPE "public"."event_kind" AS ENUM('training', 'match', 'other');--> statement-breakpoint
CREATE TABLE "attendance_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"note" text,
	"recorded_by_user_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attribution_org_id" uuid,
	"attribution_external_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_entry_event_person" UNIQUE("event_id","person_id"),
	CONSTRAINT "attendance_entry_attribution_at_most_one" CHECK (("attendance_entry"."attribution_org_id" IS NOT NULL)::int + ("attendance_entry"."attribution_external_id" IS NOT NULL)::int <= 1)
);
--> statement-breakpoint
ALTER TABLE "attendance_entry" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"kind" "event_kind" DEFAULT 'training' NOT NULL,
	"title" text,
	"location" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"note" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attendance_entry" ADD CONSTRAINT "attendance_entry_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_entry" ADD CONSTRAINT "attendance_entry_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_entry" ADD CONSTRAINT "attendance_entry_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_entry" ADD CONSTRAINT "attendance_entry_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_entry" ADD CONSTRAINT "attendance_entry_attribution_org_id_org_id_fk" FOREIGN KEY ("attribution_org_id") REFERENCES "public"."org"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_entry" ADD CONSTRAINT "attendance_entry_attribution_external_id_external_org_id_fk" FOREIGN KEY ("attribution_external_id") REFERENCES "public"."external_org"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "attendance_entry_tenant" ON "attendance_entry" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint
CREATE POLICY "event_tenant" ON "event" AS PERMISSIVE FOR ALL TO "commons_app" USING (org_id = current_setting('app.current_org', true)::uuid) WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);