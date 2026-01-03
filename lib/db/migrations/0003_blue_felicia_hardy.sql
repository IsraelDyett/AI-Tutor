ALTER TABLE "transcription_files" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "transcription_files" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."transcription_status";--> statement-breakpoint
CREATE TYPE "public"."transcription_status" AS ENUM('pending', 'transcript processing', 'transcript completed', 'analytics processing', 'analytics completed', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "transcription_files" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."transcription_status";--> statement-breakpoint
ALTER TABLE "transcription_files" ALTER COLUMN "status" SET DATA TYPE "public"."transcription_status" USING "status"::"public"."transcription_status";--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "talk_to_listen_ratio" varchar(15);--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "call_duration" varchar(15);--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "longest_rep_monologue" varchar(15);--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "question_rate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "objection_count" integer;--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "speech_rate_wpm" integer;--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "objection_handling_effectiveness_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "call_performance_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "objection_type_distribution" jsonb;--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "filler_word_frequency" jsonb;--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "strengths_highlight" text[];--> statement-breakpoint
ALTER TABLE "transcription_files" ADD COLUMN "areas_for_improvement" text[];