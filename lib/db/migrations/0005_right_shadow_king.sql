CREATE TABLE "manager_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"transcription_file_id" integer NOT NULL,
	"author_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manager_comments" ADD CONSTRAINT "manager_comments_transcription_file_id_transcription_files_id_fk" FOREIGN KEY ("transcription_file_id") REFERENCES "public"."transcription_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_comments" ADD CONSTRAINT "manager_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;