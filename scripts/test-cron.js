const { createClient } = require('@supabase/supabase-js')

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  console.log('Fetching queued replies...')
  const { data: queuedReplies, error } = await supabase
    .from('reply_queue')
    .select('id, lead_id')
    .eq('status', 'pending')
    .lte('send_after', new Date().toISOString())
    .limit(20)

  if (error) {
    console.error('Error fetching replies:', error)
    return
  }

  if (!queuedReplies || queuedReplies.length === 0) {
    console.log('No queued replies found.')
    return
  }

  console.log(`Found ${queuedReplies.length} replies to process.`)
  for (const item of queuedReplies) {
    console.log(`Processing reply ${item.id} for lead ${item.lead_id}...`)
    
    // We update to processing just like the cron job
    await supabase.from('reply_queue').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', item.id)
    
    // Make request to the local API? No, we can't because local dev server isn't running.
    // Instead we can just trigger it using fetch to their production API if we know the URL.
    // But since this runs the DB query directly, maybe we can fetch the local API if we start next dev?
  }
}

run().catch(console.error)
