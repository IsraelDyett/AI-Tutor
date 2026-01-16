CREATE TYPE "public"."education_level" AS ENUM('SEA', 'CSEC', 'CAPE');--> statement-breakpoint
ALTER TYPE "public"."subjects" ADD VALUE 'Mathematics';--> statement-breakpoint
ALTER TYPE "public"."subjects" ADD VALUE 'ELA';--> statement-breakpoint
ALTER TYPE "public"."subjects" ADD VALUE 'Creative Writing';--> statement-breakpoint
ALTER TYPE "public"."subjects" ADD VALUE 'Communication Studies';--> statement-breakpoint
ALTER TYPE "public"."subjects" ADD VALUE 'Pure Mathematics';--> statement-breakpoint
ALTER TYPE "public"."subjects" ADD VALUE 'Sociology';--> statement-breakpoint
ALTER TYPE "public"."subjects" ADD VALUE 'Management of Business';--> statement-breakpoint
ALTER TYPE "public"."subjects" ADD VALUE 'Digital Media';--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"icon" varchar(50),
	"education_level" "education_level" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_sessions" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "education_level" "education_level" DEFAULT 'CSEC' NOT NULL;