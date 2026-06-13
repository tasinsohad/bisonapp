import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { calculateNextSendAt } from '@/lib/followup-scheduler'
import { getSettings } from '@/lib/settings'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await request.json()

  if (!['pause', 'resume', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data: enrollment } = await supabase
    .from('followup_enrollments')
    .select('*, followup_sequences(steps)')
    .eq('lead_id', params.id)
    .in('status', action === 'resume' ? ['paused'] : ['active', 'paused', 'failed'])
    .single()

  if (!enrollment) {
    return NextResponse.json({ error: 'No applicable enrollment found' }, { status: 404 })
  }

  const updates: any = {
    status: action === 'pause' ? 'paused' : (action === 'cancel' ? 'cancelled' : 'active'),
    updated_at: new Date().toISOString()
  }

  if (action === 'resume') {
    // Recalculate next_send_at
    const settings = await getSettings()
    const timezone = settings.app_timezone || 'America/New_York'
    const windowStart = parseInt(settings.send_window_start || '9')
    const windowEnd = parseInt(settings.send_window_end || '18')

    const steps = enrollment.followup_sequences.steps as any[]
    const currentStepConfig = steps[enrollment.current_step - 1]
    
    if (currentStepConfig) {
      const nextSendAt = calculateNextSendAt(currentStepConfig, timezone, windowStart, windowEnd)
      updates.next_send_at = nextSendAt.toISOString()
    }
  }

  const { data, error } = await supabase
    .from('followup_enrollments')
    .update(updates)
    .eq('id', enrollment.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log activity
  const { data: lead } = await supabase.from('leads').select('email, first_name, last_name').eq('id', params.id).single()
  
  if (lead) {
    await supabase.from('activity_feed').insert({
      lead_id: params.id,
      lead_email: lead.email,
      lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
      event_type: 'status_changed',
      description: `Follow-up enrollment ${action}d`,
    })
  }

  return NextResponse.json({ data })
}
