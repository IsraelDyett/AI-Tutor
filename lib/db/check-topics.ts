import { db } from './drizzle';
import { sql } from 'drizzle-orm';

async function main() {
    try {
        const r = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'topics'`);
        process.stdout.write('COLUMNS_START' + JSON.stringify(r) + 'COLUMNS_END');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
main();
