CREATE TABLE "topic_resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "system_instructions" text;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "lesson_plan" text;--> statement-breakpoint
ALTER TABLE "topic_resources" ADD CONSTRAINT "topic_resources_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;