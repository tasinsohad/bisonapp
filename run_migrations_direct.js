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

    // Update setting to 5
    console.log("⏳ Updating inbound_reply_delay_minutes to 5...");
    await client.query("UPDATE settings SET value = '5' WHERE key = 'inbound_reply_delay_minutes'");
    console.log("✅ Successfully updated setting to 5");

  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigrations();
