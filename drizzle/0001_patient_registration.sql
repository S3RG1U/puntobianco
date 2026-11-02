CREATE TYPE "public"."apartment_type" AS ENUM('studio', 'one_bedroom_sofa', 'two_bedrooms', 'two_bedrooms_living');--> statement-breakpoint
CREATE TYPE "public"."transfer_direction" AS ENUM('one_way', 'round_trip');--> statement-breakpoint
CREATE TABLE "accommodations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"apartment_type" "apartment_type" NOT NULL,
	CONSTRAINT "accommodations_id_type_unique" UNIQUE("id","apartment_type"),
	CONSTRAINT "accommodations_name_not_empty" CHECK (length(trim("accommodations"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "patient_accommodations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"apartment_type" "apartment_type" NOT NULL,
	"accommodation_id" uuid,
	"is_free" boolean DEFAULT false NOT NULL,
	"free_days" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "patient_accommodations_visit_id_unique" UNIQUE("visit_id"),
	CONSTRAINT "patient_accommodations_free_days_valid" CHECK (("patient_accommodations"."is_free" AND "patient_accommodations"."free_days" > 0) OR (NOT "patient_accommodations"."is_free" AND "patient_accommodations"."free_days" = 0))
);
--> statement-breakpoint
CREATE TABLE "patient_companions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"treatment_visit_id" uuid,
	CONSTRAINT "patient_companions_visit_patient_unique" UNIQUE("visit_id","patient_id"),
	CONSTRAINT "patient_companions_not_same_visit" CHECK ("patient_companions"."treatment_visit_id" IS NULL OR "patient_companions"."treatment_visit_id" <> "patient_companions"."visit_id")
);
--> statement-breakpoint
CREATE TABLE "patient_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"is_free" boolean NOT NULL,
	"direction" "transfer_direction" NOT NULL,
	CONSTRAINT "patient_transfers_visit_id_unique" UNIQUE("visit_id")
);
--> statement-breakpoint
CREATE TABLE "patient_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"coordinator_id" text NOT NULL,
	"arrival_at" timestamp with time zone NOT NULL,
	"departure_at" timestamp with time zone NOT NULL,
	"availability_notes" text DEFAULT '' NOT NULL,
	"treatment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_visits_id_patient_unique" UNIQUE("id","patient_id"),
	CONSTRAINT "patient_visits_dates_valid" CHECK ("patient_visits"."departure_at" > "patient_visits"."arrival_at"),
	CONSTRAINT "patient_visits_treatment_not_empty" CHECK (length(trim("patient_visits"."treatment")) > 0)
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patients_first_name_not_empty" CHECK (length(trim("patients"."first_name")) > 0),
	CONSTRAINT "patients_last_name_not_empty" CHECK (length(trim("patients"."last_name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "patient_accommodations" ADD CONSTRAINT "patient_accommodations_visit_id_patient_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_accommodations" ADD CONSTRAINT "patient_accommodation_requested_type_fk" FOREIGN KEY ("accommodation_id","apartment_type") REFERENCES "public"."accommodations"("id","apartment_type") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_companions" ADD CONSTRAINT "patient_companions_visit_id_patient_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_companions" ADD CONSTRAINT "patient_companions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_companions" ADD CONSTRAINT "companion_treatment_visit_patient_fk" FOREIGN KEY ("treatment_visit_id","patient_id") REFERENCES "public"."patient_visits"("id","patient_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_transfers" ADD CONSTRAINT "patient_transfers_visit_id_patient_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_coordinator_id_users_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patient_accommodations_apartment_idx" ON "patient_accommodations" USING btree ("accommodation_id");--> statement-breakpoint
CREATE INDEX "patient_companions_patient_idx" ON "patient_companions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_visits_patient_idx" ON "patient_visits" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_visits_coordinator_idx" ON "patient_visits" USING btree ("coordinator_id");--> statement-breakpoint
CREATE INDEX "patient_visits_arrival_idx" ON "patient_visits" USING btree ("arrival_at");