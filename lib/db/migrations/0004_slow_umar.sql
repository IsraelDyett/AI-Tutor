CREATE TABLE "team_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"transcripts_uploaded" integer DEFAULT 0 NOT NULL,
	"coaching_calls_used" integer DEFAULT 0 NOT NULL,
	"active_members" integer DEFAULT 0 NOT NULL,
	"is_transcript_limit_reached" boolean DEFAULT false NOT NULL,
	"is_member_limit_reached" boolean DEFAULT false NOT NULL,
	"is_coaching_call_limit_reached" boolean DEFAULT false NOT NULL,
	"cycle_start_date" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_usage_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
ALTER TABLE "team_usage" ADD CONSTRAINT "team_usage_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;