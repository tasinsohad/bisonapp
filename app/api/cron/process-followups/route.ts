import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { calculateNextSendAt, isWithinSendWindow, isWeekend } from '@/lib/followup-scheduler'
import { runFollowupAgent, runAppointmentSetter } from '@/lib/ai'
import { sendBisonEmail } from '@/lib/send-email'
import { syncLeadThread } from '@/lib/bison-sync'

export async function GET(request: NextRequest) {
  return processCron(request)
}

export async function POST(request: NextRequest) {
  return processCron(request)
}

async function processCron(request: NextRequest) {
  // Validate CRON_SECRET if it exists in env
  const expectedSecret = process.env.CRON_SECRET
  if (expectedSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const settings = await getSettings()
  
  // Vercel execution timeout guard (45 seconds)
  const startTime = Date.now()
  const MAX_EXECUTION_TIME = 45000

  // 0. Process queued inbound replies
  const { data: queuedReplies } = await supabase
    .from('reply_queue')
    .select('id, lead_id')
    .eq('status', 'pending')
    .lte('send_after', new Date().toISOString())
    .limit(20)
    
  if (queuedReplies && queuedReplies.length > 0) {
    for (const item of queuedReplies) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) break;
      await supabase.from('reply_queue').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', item.id)
      try {
        const success = await runAppointmentSetter(item.lead_id)
        const finalStatus = success ? 'completed' : 'failed'
        await supabase.from('reply_queue').update({ status: finalStatus, updated_at: new Date().toISOString() }).eq('id', item.id)
      } catch (err) {
        console.error(`Failed to process queued reply ${item.id}:`, err)
        await supabase.from('reply_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', item.id)
      }
    }
  }

  // 1. Get due enrollments
  const { data: enrollments, error } = await supabase
    .from('followup_enrollments')
    .select(`
      *,
      leads(*),
      followup_sequences(*)
    `)
    .eq('status', 'active')
    .lte('next_send_at', new Date().toISOString())
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!enrollments || enrollments.length === 0) {
    return NextResponse.json({ message: 'No due followups' }, { status: 200 })
  }

  const timezone = settings.app_timezone || 'America/New_York'
  const windowStart = parseInt(settings.send_window_start || '9')
  const windowEnd = parseInt(settings.send_window_end || '18')
  
  let processed = 0
  let sent = 0
  let failed = 0

  for (const enrollment of enrollments) {
    if (Date.now() - startTime > MAX_EXECUTION_TIME) break;
    
    processed++
    const lead = enrollment.leads
    const sequence = enrollment.followup_sequences

    // a. Guard: skip if lead status is not engaged/new
    if (['meeting_scheduled', 'done', 'unsubscribed'].includes(lead.status)) {
      await updateEnrollmentStatus(supabase, enrollment.id, 'completed')
      continue
    }

    // b. Guard: check if current step > total steps
    const steps = sequence.steps as any[]
    if (enrollment.current_step > steps.length) {
      await updateEnrollmentStatus(supabase, enrollment.id, 'completed')
      continue
    }

    const currentStepConfig = steps[enrollment.current_step - 1]

    // Sync the thread right before sending to ensure no new reply was missed
    if (lead.bison_reply_id) {
      try {
        const syncResult = await syncLeadThread(lead)
        if (syncResult.success && syncResult.hasNewReply) {
          // Sync automatically pauses the enrollment in the database.
          // Skip sending the follow-up.
          continue
        }
      } catch (err) {
        console.error(`Thread sync failed for lead ${lead.id}:`, err)
      }
    }

    // c. Guard: check if lead replied recently (if auto pause enabled)
    if (settings.auto_pause_on_reply === 'true') {
      const { data: conv } = await supabase
        .from('conversations')
        .select('messages')
        .eq('lead_id', lead.id)
        .single()
        
      if (conv?.messages) {
        // Find last outbound and last inbound
        const msgs = conv.messages as any[]
        let lastOutboundTime = 0
        let lastInboundTime = 0
        
        for (const msg of msgs) {
          const t = new Date(msg.timestamp).getTime()
          if (msg.role === 'outbound' && t > lastOutboundTime) lastOutboundTime = t
          if (msg.role === 'inbound' && t > lastInboundTime) lastInboundTime = t
        }
        
        // If inbound happened AFTER outbound, lead replied!
        if (lastInboundTime > lastOutboundTime) {
          await updateEnrollmentStatus(supabase, enrollment.id, 'paused')
          continue
        }
      }
    }

    // d. Weekend / send window checks for RIGHT NOW
    // We already passed the lte('next_send_at', NOW) check, but maybe it's the weekend now?
    if (!currentStepConfig.send_on_weekends && isWeekend(timezone)) {
      // Re-calculate next_send_at and postpone
      const newNext = calculateNextSendAt(currentStepConfig, timezone, windowStart, windowEnd)
      await supabase.from('followup_enrollments').update({ next_send_at: newNext.toISOString() }).eq('id', enrollment.id)
      continue
    }
    
    if (!isWithinSendWindow(timezone, windowStart, windowEnd)) {
      // Postpone to next window start
      const newNext = calculateNextSendAt(currentStepConfig, timezone, windowStart, windowEnd)
      await supabase.from('followup_enrollments').update({ next_send_at: newNext.toISOString() }).eq('id', enrollment.id)
      continue
    }

    // e. Get message (custom or AI)
    const message = await runFollowupAgent(
      lead,
      enrollment.current_step,
      steps.length,
      currentStepConfig.custom_message
    )

    // f. If Done signal
    if (!message) {
      await updateEnrollmentStatus(supabase, enrollment.id, 'completed')
      continue
    }

    // g. Send Email
    const result = await sendBisonEmail({ lead, messageText: message })

    // h. Handle result
    if (result.success) {
      sent++
      
      // Append to conversation
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, messages')
        .eq('lead_id', lead.id)
        .single()

      if (conv) {
        const messages = [...(conv.messages || []), {
          role: 'outbound',
          content: message,
          from_name: lead.bison_sender_email_name || '',
          from_email: lead.bison_sender_email_address || '',
          timestamp: new Date().toISOString(),
          source: 'agent',
        }]

        await supabase
          .from('conversations')
          .update({
            messages,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', conv.id)
      }

      // Calculate next send at for NEXT step
      const nextStepConfig = steps[enrollment.current_step]
      let newStatus = 'active'
      let newNextSendAt = null

      if (nextStepConfig) {
        newNextSendAt = calculateNextSendAt(nextStepConfig, timezone, windowStart, windowEnd).toISOString()
      } else {
        newStatus = 'completed'
      }

      await supabase.from('followup_enrollments').update({
        current_step: enrollment.current_step + 1,
        status: newStatus,
        next_send_at: newNextSendAt,
        updated_at: new Date().toISOString()
      }).eq('id', enrollment.id)

      await supabase.from('leads').update({ last_activity_at: new Date().toISOString() }).eq('id', lead.id)
      
      await supabase.from('activity_feed').insert({
        lead_id: lead.id,
        lead_email: lead.email,
        lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
        event_type: 'followup_sent',
        description: `Follow-up ${enrollment.current_step} sent`,
      })
    } else {
      failed++
      console.error(`Failed to send followup for lead ${lead.id}: ${result.error}`)
      // It stays active, will retry next cron cycle
    }
  }

  return NextResponse.json({
    processed,
    sent,
    failed
  })
}

async function updateEnrollmentStatus(supabase: any, id: string, status: string) {
  await supabase.from('followup_enrollments').update({
    status,
    updated_at: new Date().toISOString()
  }).eq('id', id)
}
