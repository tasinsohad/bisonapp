import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leadId = params.id

    // Check if lead exists
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, status')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Cancel all active enrollments for this lead
    const { error: cancelError } = await supabase
      .from('followup_enrollments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('lead_id', leadId)
      .eq('status', 'active')

    if (cancelError) {
      return NextResponse.json({ error: cancelError.message }, { status: 500 })
    }

    // Update lead status if not already meeting_scheduled or done
    if (lead.status !== 'meeting_scheduled' && lead.status !== 'done') {
      await supabase
        .from('leads')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('id', leadId)
    }

    // Log the manual action
    await supabase.from('activity_feed').insert({
      lead_id: leadId,
      event_type: 'status_changed',
      description: 'Manually cancelled active follow-up sequences.',
      metadata: { source: 'manual_action' }
    })

    return NextResponse.json({ success: true, message: 'Follow-ups cancelled successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
