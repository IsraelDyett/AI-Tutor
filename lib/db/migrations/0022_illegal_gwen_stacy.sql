ALTER TABLE "teams" ADD COLUMN "active_education_levels" text[] DEFAULT '{"SEA"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "active_education_level";