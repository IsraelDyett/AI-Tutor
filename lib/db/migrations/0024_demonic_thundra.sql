CREATE TABLE "education_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "education_levels_name_unique" UNIQUE("name"),
	CONSTRAINT "education_levels_slug_unique" UNIQUE("slug")
);
