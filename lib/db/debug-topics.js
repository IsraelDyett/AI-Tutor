
const p = require('postgres');
require('dotenv').config();

async function debug() {
    const sql = p(process.env.POSTGRES_URL);
    try {
        const subjects = await sql`SELECT id, name, education_level FROM subjects`;
        console.log('Subjects:', subjects.map(s => `${s.id}:${s.name}(${s.education_level})`).join(', '));

        const topics = await sql`SELECT id, name, subject, education_level, team_id FROM topics`;
        console.log('Total Topics:', topics.length);

        const filtered = topics.filter(t =>
            t.subject && t.subject.toLowerCase() === 'english' &&
            (t.education_level === 'CSEC' || !t.education_level)
        );
        console.log('Filtered (English/CSEC):', filtered.length);
        if (filtered.length > 0) {
            console.log('Sample Filtered Topic:', JSON.stringify(filtered[0]));
        }

        const users = await sql`SELECT id, email FROM users LIMIT 1`;
        if (users.length > 0) {
            const teams = await sql`SELECT team_id FROM team_members WHERE user_id = ${users[0].id}`;
            console.log(`User ${users[0].id} Team: ${teams[0]?.team_id}`);
        }
    } catch (e) { console.error(e); }
    finally { await sql.end(); process.exit(); }
}
debug();
