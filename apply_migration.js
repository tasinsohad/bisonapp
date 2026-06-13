const fs = require('fs');
const { Client } = require('pg');

const envFile = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].replace(/['"]/g, '').trim();
  }
}

async function migrate() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    await client.query(`
      ALTER TABLE reply_queue ADD COLUMN IF NOT EXISTS error_message text;
      ALTER TABLE followup_enrollments ADD COLUMN IF NOT EXISTS error_message text;
    `);
    
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
