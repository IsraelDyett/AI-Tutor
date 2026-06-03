/**
 * Mark migrations 0000..0019 as applied when the DB schema already exists
 * but drizzle.__drizzle_migrations is empty (common after manual/push setup).
 *
 * Usage: node scripts/baseline-migrations.mjs
 * Then:  npx drizzle-kit migrate
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const migrationsDir = path.join(process.cwd(), 'lib/db/migrations');
const journal = JSON.parse(
  fs.readFileSync(path.join(migrationsDir, 'meta/_journal.json'), 'utf8')
);

const upToIdx = 19; // baseline everything before 0020_nice_shotgun
const entries = journal.entries.filter((e) => e.idx <= upToIdx);

const sql = postgres(process.env.POSTGRES_URL);

const existing = await sql`
  SELECT hash FROM drizzle.__drizzle_migrations
`;
if (existing.length > 0) {
  console.error(
    `Abort: ${existing.length} migration(s) already recorded. Baseline only when the journal is empty.`
  );
  await sql.end();
  process.exit(1);
}

for (const entry of entries) {
  const filePath = path.join(migrationsDir, `${entry.tag}.sql`);
  const query = fs.readFileSync(filePath, 'utf8');
  const hash = crypto.createHash('sha256').update(query).digest('hex');

  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES (${hash}, ${entry.when})
  `;
  console.log(`Baselined ${entry.tag}`);
}

console.log(`Done. Marked ${entries.length} migrations as applied.`);
await sql.end();
