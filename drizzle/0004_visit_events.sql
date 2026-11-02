CREATE TYPE "public"."visit_event_type" AS ENUM('registered', 'patient_updated', 'case_started', 'case_completed', 'apartment_assigned', 'apartment_released', 'transfer_picked_up');--> statement-breakpoint
CREATE TABLE "visit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"type" "visit_event_type" NOT NULL,
	"leg" "transfer_leg",
	"apartment_name" text,
	"actor_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visit_events" ADD CONSTRAINT "visit_events_visit_id_patient_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_events" ADD CONSTRAINT "visit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visit_events_visit_idx" ON "visit_events" USING btree ("visit_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "visit_events_pickup_unique" ON "visit_events" USING btree ("visit_id","leg") WHERE "visit_events"."type" = 'transfer_picked_up';--> statement-breakpoint
-- Rebuild what saved dates can tell for visits registered before this table.
INSERT INTO "visit_events" ("visit_id", "type", "occurred_at")
SELECT "id", 'registered', "created_at" FROM "patient_visits";--> statement-breakpoint
INSERT INTO "visit_events" ("visit_id", "type", "actor_id", "occurred_at")
SELECT "id", 'case_started', "back_office_assignee_id", "back_office_started_at"
FROM "patient_visits" WHERE "back_office_started_at" IS NOT NULL;--> statement-breakpoint
INSERT INTO "visit_events" ("visit_id", "type", "occurred_at")
SELECT "id", 'case_completed', "back_office_completed_at"
FROM "patient_visits" WHERE "back_office_completed_at" IS NOT NULL;--> statement-breakpoint
INSERT INTO "visit_events" ("visit_id", "type", "apartment_name", "occurred_at")
SELECT r."visit_id", 'apartment_assigned', a."name", r."reserved_at"
FROM "patient_accommodations" r
JOIN "accommodations" a ON a."id" = r."accommodation_id"
WHERE r."reserved_at" IS NOT NULL;
