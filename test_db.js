const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of envFile.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].replace(/['"]/g, '').trim();
  }
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseKey = line.split('=')[1].replace(/['"]/g, '').trim();
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: leads } = await supabase.from('leads').select('id, email, status, bison_reply_id').order('created_at', { ascending: false }).limit(2);
  console.log("LEADS:");
  console.log(leads);

  if (leads && leads.length > 0) {
    const leadId = leads[0].id;
    console.log(`\nChecking details for Lead: ${leads[0].email} (${leadId})`);
    
    const { data: queue } = await supabase.from('reply_queue').select('*').eq('lead_id', leadId);
    console.log("\nREPLY QUEUE:");
    console.log(queue);

    const { data: followups } = await supabase.from('followup_enrollments').select('*').eq('lead_id', leadId);
    console.log("\nFOLLOWUPS:");
    console.log(followups);
    
    const { data: conv } = await supabase.from('conversations').select('*').eq('lead_id', leadId).single();
    console.log("\nCONVERSATIONS:");
    console.log(conv ? `${conv.messages?.length} messages` : 'No conversation');
  }
}
check();
