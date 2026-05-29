import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { syncLeadThread } from '@/lib/bison-sync'

export async function POST(request: NextRequest) {
  // Validate CRON_SECRET if it exists in env
  const expectedSecret = process.env.CRON_SECRET
  if (expectedSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createServerClient()

  // Select all leads that have an active conversation thread parent in Email Bison
  // and exclude completed/unsubscribed/booked leads to save API requests
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .not('bison_reply_id', 'is', null)
    .not('status', 'eq', 'meeting_scheduled')
    .not('status', 'eq', 'done')
    .not('status', 'eq', 'unsubscribed')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ message: 'No leads with active threads to sync' }, { status: 200 })
  }

  let syncedCount = 0
  let repliesDiscovered = 0
  let failedCount = 0
  const failures: { leadId: string; email: string; error: string }[] = []

  // Perform synchronization for all active threads in parallel batches
  const results = await Promise.all(
    leads.map(async (lead) => {
      const res = await syncLeadThread(lead)
      if (res.success) {
        return { success: true, leadId: lead.id, hasNewReply: res.hasNewReply }
      } else {
        return { success: false, leadId: lead.id, email: lead.email, error: res.error || 'Unknown error' }
      }
    })
  )

  for (const r of results) {
    if (r.success) {
      syncedCount++
      if (r.hasNewReply) {
        repliesDiscovered++
      }
    } else {
      failedCount++
      failures.push({
        leadId: r.leadId,
        email: r.email || '',
        error: r.error || '',
      })
    }
  }

  return NextResponse.json({
    total_leads_checked: leads.length,
    successful_syncs: syncedCount,
    new_replies_discovered: repliesDiscovered,
    failed_syncs: failedCount,
    failures: failures.length > 0 ? failures : undefined,
  }, { status: 200 })
}

// Ensure Node.js runtime and force dynamic to bypass caching
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
