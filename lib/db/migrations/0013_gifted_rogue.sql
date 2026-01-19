ALTER TABLE "subjects" ALTER COLUMN "education_level" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "subject" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "education_level" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "education_level" SET DEFAULT 'CSEC';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_password_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_password_expires" timestamp;--> statement-breakpoint
DROP TYPE "public"."education_level";--> statement-breakpoint
DROP TYPE "public"."subjects";