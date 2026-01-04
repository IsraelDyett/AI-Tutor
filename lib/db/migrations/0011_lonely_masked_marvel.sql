CREATE TABLE "flashcard_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "team_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "flashcards_limit" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "past_papers_limit" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "voice_tutor_sessions_limit" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "text_tutor_sessions_limit" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "team_usage" ADD COLUMN "flashcards_generated" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "team_usage" ADD COLUMN "past_papers_generated" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "team_usage" ADD COLUMN "voice_tutor_sessions_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "team_usage" ADD COLUMN "text_tutor_sessions_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "team_usage" ADD COLUMN "is_flashcard_limit_reached" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team_usage" ADD COLUMN "is_past_paper_limit_reached" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team_usage" ADD COLUMN "is_voice_tutor_limit_reached" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team_usage" ADD COLUMN "is_text_tutor_limit_reached" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard_tests" ADD CONSTRAINT "flashcard_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_tests" ADD CONSTRAINT "flashcard_tests_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;