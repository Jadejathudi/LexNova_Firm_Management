require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to server/.env');
}

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  await sql`ALTER TABLE bench_judges ADD COLUMN IF NOT EXISTS profile_photo TEXT`;
  console.log('Bench judge photo column is ready.');
}

migrate().catch(err => {
  console.error('Bench judge photo migration failed:', err);
  process.exit(1);
});
