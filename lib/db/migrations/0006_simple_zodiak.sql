CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"displayName" varchar(50) NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" varchar(50) NOT NULL,
	"monthly_price" integer NOT NULL,
	"annuallyPrice" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"features" text[] DEFAULT '{}' NOT NULL
);
