import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { calculateNextSendAt } from '@/lib/followup-scheduler'
import { getSettings } from '@/lib/settings'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { sequence_id } = await request.json()

  if (!sequence_id) {
    return NextResponse.json({ error: 'Sequence ID is required' }, { status: 400 })
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

  // Check if lead is already enrolled
  const { data: existing } = await supabase
    .from('followup_enrollments')
    .select('id')
    .eq('lead_id', params.id)
    .eq('status', 'active')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Lead is already actively enrolled in a sequence' }, { status: 400 })
  }

  // Calculate next_send_at for step 1
  const settings = await getSettings()
  const timezone = settings.app_timezone || 'America/New_York'
  const windowStart = parseInt(settings.send_window_start || '9')
  const windowEnd = parseInt(settings.send_window_end || '18')

  const steps = sequence.steps as any[]
  if (!steps || steps.length === 0) {
    return NextResponse.json({ error: 'Sequence has no steps' }, { status: 400 })
  }

  const step1 = steps[0]
  const nextSendAt = calculateNextSendAt(step1, timezone, windowStart, windowEnd)

  // Create enrollment
  const { data: enrollment, error: enrollError } = await supabase
    .from('followup_enrollments')
    .insert({
      lead_id: params.id,
      sequence_id,
      current_step: 1,
      status: 'active',
      next_send_at: nextSendAt.toISOString()
    })
    .select()
    .single()

  if (enrollError) {
    return NextResponse.json({ error: enrollError.message }, { status: 500 })
  }

  // Log activity
  const { data: lead } = await supabase.from('leads').select('email, first_name, last_name').eq('id', params.id).single()
  
  if (lead) {
    await supabase.from('activity_feed').insert({
      lead_id: params.id,
      lead_email: lead.email,
      lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
      event_type: 'followup_enrolled',
      description: 'Enrolled in follow-up sequence',
      metadata: { sequence_id }
    })
  }

  return NextResponse.json({ data: enrollment }, { status: 201 })
}
