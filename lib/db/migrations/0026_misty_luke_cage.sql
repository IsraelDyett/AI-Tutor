ALTER TABLE "study_sessions" DROP CONSTRAINT "study_sessions_topic_id_topics_id_fk";
--> statement-breakpoint
ALTER TABLE "study_sessions" ALTER COLUMN "topic_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;