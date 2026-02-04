import { db } from './drizzle';
import { sql } from 'drizzle-orm';

async function runManualMigration() {
    console.log('Running manual migration...');
    try {
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "topic_resources" (
        "id" serial PRIMARY KEY NOT NULL,
        "topic_id" integer NOT NULL,
        "content" text NOT NULL,
        "embedding" vector(768),
        "type" varchar(50) NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

        await db.execute(sql`
      ALTER TABLE "topic_resources" DROP CONSTRAINT IF EXISTS "topic_resources_topic_id_topics_id_fk";
    `);

        await db.execute(sql`
      ALTER TABLE "topic_resources" ADD CONSTRAINT "topic_resources_topic_id_topics_id_fk" 
      FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
    `);

        // Also add the columns to topics if they don't exist
        try {
            await db.execute(sql`ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "system_instructions" text;`);
        } catch (e) { }
        try {
            await db.execute(sql`ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "lesson_plan" text;`);
        } catch (e) { }

        console.log('Manual migration completed successfully!');
    } catch (error) {
        console.error('Failed to run manual migration:', error);
        process.exit(1);
    }
}

runManualMigration();
