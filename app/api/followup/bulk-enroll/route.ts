import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { calculateNextSendAt } from '@/lib/followup-scheduler'
import { getSettings } from '@/lib/settings'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sequence_id, status_filter } = await request.json()

  if (!sequence_id || !status_filter) {
    return NextResponse.json({ error: 'Sequence ID and status filter are required' }, { status: 400 })
  }

  // Load sequence
  const { data: sequence, error: seqError } = await supabase
    .from('followup_sequences')
    .select('steps')
    .eq('id', sequence_id)
    .single()

  if (seqError || !sequence) {
    return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
  }

  const steps = sequence.steps as any[]
  if (!steps || steps.length === 0) {
    return NextResponse.json({ error: 'Sequence has no steps' }, { status: 400 })
  }

  // Get matching leads
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, email, first_name, last_name')
    .eq('status', status_filter)

  if (leadsError || !leads || leads.length === 0) {
    return NextResponse.json({ enrolledCount: 0 })
  }

  // Get already enrolled leads
  const { data: enrolledLeads } = await supabase
    .from('followup_enrollments')
    .select('lead_id')
    .eq('status', 'active')

  const enrolledSet = new Set(enrolledLeads?.map(e => e.lead_id) || [])
  const leadsToEnroll = leads.filter(l => !enrolledSet.has(l.id))

  if (leadsToEnroll.length === 0) {
    return NextResponse.json({ enrolledCount: 0 })
  }

  // Prepare enrollments
  const settings = await getSettings()
  const timezone = settings.app_timezone || 'America/New_York'
  const windowStart = parseInt(settings.send_window_start || '9')
  const windowEnd = parseInt(settings.send_window_end || '18')
  
  const step1 = steps[0]
  const nextSendAt = calculateNextSendAt(step1, timezone, windowStart, windowEnd).toISOString()

  const enrollments = leadsToEnroll.map(lead => ({
    lead_id: lead.id,
    sequence_id,
    current_step: 1,
    status: 'active',
    next_send_at: nextSendAt
  }))

  const activities = leadsToEnroll.map(lead => ({
    lead_id: lead.id,
    lead_email: lead.email,
    lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
    event_type: 'followup_enrolled',
    description: 'Bulk enrolled in follow-up sequence',
    metadata: { sequence_id, bulk: true }
  }))

  // Insert enrollments and activities
  await supabase.from('followup_enrollments').insert(enrollments)
  await supabase.from('activity_feed').insert(activities)

  return NextResponse.json({ enrolledCount: leadsToEnroll.length })
}
