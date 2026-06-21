CREATE TABLE "past_paper_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"topic_id" integer,
	"paper_type" varchar(20) NOT NULL,
	"reference" varchar(100) NOT NULL,
	"score_percentage" integer NOT NULL,
	"correct_questions" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_performance_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"summary_markdown" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "passed_paper_questions" ADD COLUMN "worksheet_name" varchar(255);--> statement-breakpoint
ALTER TABLE "passed_paper_questions" ADD COLUMN "worksheet_number" integer;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD COLUMN "understanding_score" integer;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD COLUMN "feedback_summary" text;--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD CONSTRAINT "past_paper_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD CONSTRAINT "past_paper_attempts_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_performance_summaries" ADD CONSTRAINT "student_performance_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_performance_summaries" ADD CONSTRAINT "student_performance_summaries_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;