CREATE TABLE "actual_past_paper_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer,
	"subject" varchar(100) NOT NULL,
	"level" varchar(10) NOT NULL,
	"year" integer NOT NULL,
	"section" integer NOT NULL,
	"question_number" integer NOT NULL,
	"marks" integer DEFAULT 1 NOT NULL,
	"marking_type" varchar(5) DEFAULT 'K' NOT NULL,
	"topic_tag" varchar(100),
	"question_html" text NOT NULL,
	"answer_html" text NOT NULL,
	"working_html" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actual_past_paper_questions" ADD CONSTRAINT "actual_past_paper_questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;