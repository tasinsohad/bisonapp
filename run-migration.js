// Migration runner using Supabase's SQL API
// This uses the Supabase project's API to run raw SQL

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://haxjgupakgbyvzvsnaan.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhheGpndXBha2dieXZ6dnNuYWFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgxMTcwMiwiZXhwIjoyMDk1Mzg3NzAyfQ.6aGJs8Ya0vlZXFGdBwyT1Lk9lOwlRWTiRAH_8a0ysqo';
const PROJECT_REF = 'haxjgupakgbyvzvsnaan';

async function runSQL(sql) {
  // Use Supabase's internal SQL execution endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SQL Error (${response.status}): ${errText}`);
  }
  return response.json();
}

async function main() {
  console.log('🚀 Running LeadPilot database migration...\n');

  // First, create the exec_sql function so we can run arbitrary SQL
  const createExecFn = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
      RETURN json_build_object('success', true);
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'error', SQLERRM);
    END;
    $$;
  `;

  // Try to create the exec function via RPC bootstrap
  console.log('Setting up SQL executor function...');
  
  // We need to use the Supabase Dashboard API or direct pg connection
  // Since we can't run arbitrary SQL through REST, let's try a different approach
  
  // Read the migration file
  const sqlPath = path.join(__dirname, 'supabase', 'migrations', '001_create_tables.sql');
  const fullSQL = fs.readFileSync(sqlPath, 'utf8');

  // Try running the full SQL as a single transaction
  console.log('Attempting to run migration via Supabase SQL endpoint...');
  
  try {
    // Supabase has a /query endpoint on some instances
    const response = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: fullSQL })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Migration executed successfully via /pg/query');
      console.log(JSON.stringify(result, null, 2));
      return;
    } else {
      console.log(`/pg/query returned ${response.status}, trying alternative...`);
    }
  } catch (e) {
    console.log(`/pg/query not available: ${e.message}`);
  }

  // Output instructions for manual execution
  console.log('\n' + '='.repeat(60));
  console.log('MANUAL MIGRATION REQUIRED');
  console.log('='.repeat(60));
  console.log('\nThe Supabase REST API does not support raw SQL execution.');
  console.log('Please run the migration SQL manually:');
  console.log('\n1. Go to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
  console.log('2. Copy the contents of: supabase/migrations/001_create_tables.sql');
  console.log('3. Paste and click "Run"');
  console.log('\nAlternatively, use the Supabase CLI:');
  console.log('  npx supabase db push --db-url "YOUR_DATABASE_URL"');
  console.log('\nThe migration file is at:');
  console.log('  ' + sqlPath);
}

main().catch(console.error);
