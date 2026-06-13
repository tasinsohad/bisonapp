const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env', 'utf8');
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
  const { data: leads } = await supabase.from('leads').select('id, email, status, bison_reply_id, last_synced_at').order('created_at', { ascending: false }).limit(2);
  console.log("RECENT LEADS:");
  console.dir(leads, { depth: null });
  
  if (leads && leads.length > 0) {
    const lead = leads[0];
    
    // Check conversations
    const { data: conv } = await supabase.from('conversations').select('id, messages').eq('lead_id', lead.id).single();
    if (conv && conv.messages && conv.messages.length > 0) {
      const lastMessage = conv.messages[conv.messages.length - 1];
      console.log(`\nLast message in conversation: [${lastMessage.role}] at ${lastMessage.timestamp}`);
      
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60000);
      const msgTime = new Date(lastMessage.timestamp);
      console.log(`Is last message older than 2 days? ${msgTime.getTime() < twoDaysAgo.getTime()}`);
    } else {
      console.log("\nNo conversation messages found.");
    }

    const { data: enrolls } = await supabase.from('followup_enrollments').select('id, status, current_step, draft_message').eq('lead_id', lead.id);
    console.log("\nFollowup Enrollments:");
    console.dir(enrolls, { depth: null });
    
    const { data: queue } = await supabase.from('reply_queue').select('id, status, draft_message').eq('lead_id', lead.id);
    console.log("\nReply Queue:");
    console.dir(queue, { depth: null });
  }
}
check();
