CREATE TYPE "public"."treatment_category" AS ENUM('prevention', 'restorative', 'endodontics', 'surgery', 'implantology', 'prosthetics', 'aesthetics', 'orthodontics', 'periodontics');--> statement-breakpoint
CREATE TABLE "treatments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "treatment_category" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"duration_minutes" integer NOT NULL,
	CONSTRAINT "treatments_name_unique" UNIQUE("name"),
	CONSTRAINT "treatments_name_not_empty" CHECK (length(trim("treatments"."name")) > 0),
	CONSTRAINT "treatments_duration_range" CHECK ("treatments"."duration_minutes" BETWEEN 5 AND 600)
);
