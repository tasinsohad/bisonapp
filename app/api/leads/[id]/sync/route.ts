import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { syncLeadThread } from '@/lib/bison-sync'
import { runAppointmentSetter, runFollowupAgent } from '@/lib/ai'
import { getSettings } from '@/lib/settings'
import { calculateNextSendAt } from '@/lib/followup-scheduler'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*, followup_enrollments(status)')
    .eq('id', params.id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const settings = await getSettings()

  try {
    // 1. Force Sync Thread
    const syncResult = await syncLeadThread(lead)

    // 2. Handle Appointment Setter (Inbound Reply)
    if (syncResult.success && syncResult.hasNewReply) {
      const { data: existingQueue } = await supabase
        .from('reply_queue')
        .select('id')
        .eq('lead_id', lead.id)
        .in('status', ['drafting', 'pending', 'processing'])
        .maybeSingle()

      if (!existingQueue) {
        const delayMinutes = parseInt(settings.inbound_reply_delay_minutes || '5')
        const sendAfter = new Date(Date.now() + delayMinutes * 60000).toISOString()
        const { data: queue } = await supabase.from('reply_queue').insert({
          lead_id: lead.id,
          status: 'drafting',
          send_after: sendAfter
        }).select('id').single()

        await supabase.from('activity_feed').insert({
          lead_id: lead.id,
          lead_email: lead.email,
          lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
          event_type: 'reply_received',
          description: `Reply discovered via manual sync. AI reply queued.`,
          metadata: { source: 'manual_sync' },
        })

        if (queue) {
          runAppointmentSetter(lead.id, queue.id).catch(console.error)
        }
      }
    }

    // 3. Handle Auto-Enrollment (Outbound Message)
    const { data: latestConv } = await supabase
      .from('conversations')
      .select('messages')
      .eq('lead_id', lead.id)
      .single()

    if (latestConv && latestConv.messages && latestConv.messages.length > 0) {
      const lastMessage = latestConv.messages[latestConv.messages.length - 1]
      
      const hasActiveEnrollment = lead.followup_enrollments?.some((e: any) => ['active', 'paused', 'failed'].includes(e.status))
      
      if (lastMessage.role === 'outbound' && !hasActiveEnrollment) {
        // Enroll immediately
        const { data: defaultSeq } = await supabase.from('followup_sequences').select('id, steps').order('created_at', { ascending: true }).limit(1).maybeSingle()
        if (defaultSeq && defaultSeq.steps && (defaultSeq.steps as any[]).length > 0) {
          const timezone = settings.app_timezone || 'America/New_York'
          const windowStart = parseInt(settings.send_window_start || '9')
          const windowEnd = parseInt(settings.send_window_end || '18')
          
          const step1 = (defaultSeq.steps as any[])[0]
          const baseDate = new Date(lastMessage.timestamp)
          const nextSendAt = calculateNextSendAt(step1, timezone, windowStart, windowEnd, baseDate)

          const { data: newEnrollment } = await supabase
            .from('followup_enrollments')
            .insert({
              lead_id: lead.id,
              sequence_id: defaultSeq.id,
              current_step: 1,
              status: 'active',
              next_send_at: nextSendAt.toISOString()
            })
            .select()
            .single()

          if (newEnrollment) {
            await supabase.from('activity_feed').insert({
              lead_id: lead.id,
              lead_email: lead.email,
              lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
              event_type: 'followup_enrolled',
              description: 'Automatically enrolled in follow-up sequence with countdown based on last outbound message (Manual Sync)',
              metadata: { source: 'manual_sync' }
            })

            runFollowupAgent(lead, 1, (defaultSeq.steps as any[]).length, step1.custom_message).then(async (msg) => {
              if (msg) await supabase.from('followup_enrollments').update({ draft_message: msg }).eq('id', newEnrollment.id)
            }).catch(async (err) => {
              await supabase.from('followup_enrollments').update({ status: 'failed', error_message: err.message }).eq('id', newEnrollment.id)
            })
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Manual sync failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
