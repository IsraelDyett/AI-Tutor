CREATE TABLE "lesson_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	"progress" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actual_past_paper_questions" ALTER COLUMN "section" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "actual_past_paper_questions" ALTER COLUMN "question_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "actual_past_paper_questions" ALTER COLUMN "marks" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "actual_past_paper_questions" ALTER COLUMN "marks" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "actual_past_paper_questions" ALTER COLUMN "marking_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "actual_past_paper_questions" ALTER COLUMN "question_html" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "actual_past_paper_questions" ALTER COLUMN "answer_html" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;