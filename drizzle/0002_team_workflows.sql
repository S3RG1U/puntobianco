CREATE TYPE "public"."accommodation_status" AS ENUM('unprocessed', 'reserved');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."transfer_leg" AS ENUM('arrival', 'departure');--> statement-breakpoint
CREATE TABLE "notification_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "notification_reads_user_event_unique" UNIQUE("user_id","notification_id")
);
--> statement-breakpoint
CREATE TABLE "team_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audience" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"href" text NOT NULL,
	"visit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"last_error" text,
	CONSTRAINT "telegram_deliveries_notification_id_unique" UNIQUE("notification_id")
);
--> statement-breakpoint
ALTER TABLE "patient_accommodations" ADD COLUMN "status" "accommodation_status" DEFAULT 'unprocessed' NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_accommodations" ADD COLUMN "reserved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patient_transfers" ADD COLUMN "one_way_leg" "transfer_leg" DEFAULT 'arrival' NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_visits" ADD COLUMN "back_office_status" "case_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_visits" ADD COLUMN "back_office_assignee_id" text;--> statement-breakpoint
ALTER TABLE "patient_visits" ADD COLUMN "back_office_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patient_visits" ADD COLUMN "back_office_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_team_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."team_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_notifications" ADD CONSTRAINT "team_notifications_visit_id_patient_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_deliveries" ADD CONSTRAINT "telegram_deliveries_notification_id_team_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."team_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_notifications_audience_created_idx" ON "team_notifications" USING btree ("audience","created_at");--> statement-breakpoint
CREATE INDEX "telegram_deliveries_due_idx" ON "telegram_deliveries" USING btree ("delivered_at","available_at");--> statement-breakpoint
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_back_office_assignee_id_users_id_fk" FOREIGN KEY ("back_office_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
UPDATE "patient_accommodations" SET "status" = 'reserved', "reserved_at" = now() WHERE "accommodation_id" IS NOT NULL;
