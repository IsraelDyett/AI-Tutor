ALTER TABLE "actual_past_paper_questions" ADD COLUMN "topic_description" text;--> statement-breakpoint
ALTER TABLE "actual_past_paper_questions" ADD COLUMN "question_embedding" vector(768);