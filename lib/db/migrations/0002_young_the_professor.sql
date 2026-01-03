CREATE TYPE "public"."transcription_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "transcription" text;--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "status" "transcription_status" DEFAULT 'pending';