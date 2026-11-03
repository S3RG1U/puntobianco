CREATE TABLE "transfer_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"leg" "transfer_leg" NOT NULL,
	"action" text NOT NULL,
	"previous_at" timestamp with time zone NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"pickup" text,
	"dropoff" text,
	"actor_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"leg" "transfer_leg" NOT NULL,
	"scheduled_at" timestamp with time zone,
	"pickup" text,
	"dropoff" text,
	"completed_at" timestamp with time zone,
	"revision" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "transfer_plans_leg_unique" UNIQUE("transfer_id","leg")
);
--> statement-breakpoint
ALTER TABLE "transfer_changes" ADD CONSTRAINT "transfer_changes_transfer_id_patient_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."patient_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_changes" ADD CONSTRAINT "transfer_changes_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_plans" ADD CONSTRAINT "transfer_plans_transfer_id_patient_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."patient_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transfer_changes_leg_idx" ON "transfer_changes" USING btree ("transfer_id","leg","occurred_at");