import { db } from './drizzle';
import { sql } from 'drizzle-orm';

async function checkVectorType() {
    console.log('Checking for vector type...');
    try {
        const result = await db.execute(sql`
      SELECT n.nspname as schema, t.typname as type
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'vector';
    `);
        console.log('QueryResult:', JSON.stringify(result));

        const extensions = await db.execute(sql`
      SELECT e.extname, n.nspname as schema
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extconfig[1] -- This is slightly wrong but let's try a better query
    `);

        const extensionsDetailed = await db.execute(sql`
      SELECT e.extname, n.nspname as schema
      FROM pg_extension e
      JOIN pg_namespace n ON e.extnamespace = n.oid;
    `);
        console.log('Extensions Detailed:', JSON.stringify(extensionsDetailed));

    } catch (error) {
        console.error('Failed to check vector type:', error);
        process.exit(1);
    }
}

checkVectorType();
