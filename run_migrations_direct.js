const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const password = encodeURIComponent('JRd#Z%S85qf/@+R');
const connectionString = `postgresql://postgres.haxjgupakgbyvzvsnaan:${password}@aws-1-us-east-2.pooler.supabase.com:5432/postgres`;

async function runMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Connected to Supabase PostgreSQL database");

    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '006_add_last_synced_at.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log("⏳ Running 006 migration...");
    await client.query(sql);
    console.log("✅ Successfully ran migration");

  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigrations();
