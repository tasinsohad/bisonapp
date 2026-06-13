import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { calculateNextSendAt, isWithinSendWindow, isWeekend } from '@/lib/followup-scheduler'
import { runFollowupAgent, executeDraftedQueueItem, runAppointmentSetter } from '@/lib/ai'
import { sendBisonEmail } from '@/lib/send-email'
import { syncLeadThread } from '@/lib/bison-sync'
import { getLeadReplies } from '@/lib/bison'

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

  // ──────────────────────────────────────────────────────────────
  // STEP 0: PROACTIVE REPLY CHECK via Bison API
  // ──────────────────────────────────────────────────────────────
  
  const pollLead = async (lead: any) => {
    try {
      const syncResult = await syncLeadThread(lead)
      if (syncResult.success && syncResult.hasNewReply) {
        // Check if there's already a pending/drafting queue item for this lead
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
            description: `Reply discovered via API poll (missed webhook). AI reply queued.`,
            metadata: { source: 'cron_poll' },
          })

          if (queue) {
            runAppointmentSetter(lead.id, queue.id).catch(console.error)
          }
        }
      }
    } catch (err) {
      console.error(`[Reply Check] Failed for lead ${lead.id}:`, err)
    }
  }

  // Set 1: Leads with active enrollments
  const { data: activeEnrollments } = await supabase
    .from('followup_enrollments')
    .select('id, lead_id, enrolled_at, current_step, leads(*)')
    .eq('status', 'active')
    .limit(30)

  if (activeEnrollments && activeEnrollments.length > 0) {
    for (const enrollment of activeEnrollments) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) break
      const lead = enrollment.leads as any
      if (!lead || !lead.bison_reply_id) continue
      await pollLead(lead)
    }
  }

  // Set 2: Engaged leads not synced in 30 minutes
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60000).toISOString()
  const { data: engagedLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'engaged')
    .not('bison_reply_id', 'is', null)
    .lte('last_synced_at', thirtyMinsAgo)
    .limit(30)

  if (engagedLeads && engagedLeads.length > 0) {
    for (const lead of engagedLeads) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) break
      await pollLead(lead)
    }
  }

  // ──────────────────────────────────────────────────────────────
  // STEP 0.1: AUTO-ENROLL LEADS (Immediate Enrollment with Countdown)
  // ──────────────────────────────────────────────────────────────
  
  // Find leads that are engaged and have no active followups
  const { data: unresponsiveCandidates } = await supabase
    .from('leads')
    .select(`
      *,
      conversations ( messages ),
      followup_enrollments ( status )
    `)
    .eq('status', 'engaged')
    .limit(50)

  if (unresponsiveCandidates && unresponsiveCandidates.length > 0) {
    // Get default sequence id
    const { data: defaultSeq } = await supabase.from('followup_sequences').select('id, steps').order('created_at', { ascending: true }).limit(1).maybeSingle()
    
    if (defaultSeq && defaultSeq.steps && (defaultSeq.steps as any[]).length > 0) {
      for (const lead of unresponsiveCandidates) {
        if (Date.now() - startTime > MAX_EXECUTION_TIME) break
        
        // Skip if currently has an active, failed, or paused enrollment
        const hasActiveEnrollment = lead.followup_enrollments?.some((e: any) => ['active', 'paused', 'failed'].includes(e.status))
        if (hasActiveEnrollment) continue

        // Check last message in conversation
        if (lead.conversations && lead.conversations.length > 0) {
          const messages = lead.conversations[0].messages || []
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1]
            // If last message was outbound, enroll them immediately!
            // We use the timestamp of that message to calculate the 48-hour countdown.
            if (lastMessage.role === 'outbound') {
              // Enroll them
              const timezone = settings.app_timezone || 'America/New_York'
              const windowStart = parseInt(settings.send_window_start || '9')
              const windowEnd = parseInt(settings.send_window_end || '18')
              
              const step1 = (defaultSeq.steps as any[])[0]
              
              // Use the outbound message timestamp as the base date for the countdown
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
                  description: 'Automatically enrolled in follow-up sequence with countdown based on last outbound message',
                  metadata: { source: 'auto_enrollment' }
                })

                // Gen draft
                runFollowupAgent(lead, 1, (defaultSeq.steps as any[]).length, step1.custom_message).then(async (msg) => {
                  if (msg) {
                    await supabase.from('followup_enrollments').update({ draft_message: msg }).eq('id', newEnrollment.id)
                  }
                }).catch(async (err) => {
                  await supabase.from('followup_enrollments').update({ status: 'failed', error_message: err.message }).eq('id', newEnrollment.id)
                })
              }
            }
          }
        }
      }
    }
  }

  // 0. Process queued inbound replies that need drafting
  const { data: draftingReplies } = await supabase
    .from('reply_queue')
    .select('id, lead_id')
    .eq('status', 'drafting')
    .limit(10)
    
  if (draftingReplies && draftingReplies.length > 0) {
    for (const item of draftingReplies) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) break;
      await supabase.from('reply_queue').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', item.id)
      try {
        await runAppointmentSetter(item.lead_id, item.id)
      } catch (err) {
        console.error(`Failed to draft queued reply ${item.id}:`, err)
        await supabase.from('reply_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', item.id)
      }
    }
  }

  // 0.5 Process queued inbound replies that are ready to send
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
        const success = await executeDraftedQueueItem(item.id)
        // executeDraftedQueueItem handles updating the status.
      } catch (err) {
        console.error(`Failed to process queued reply ${item.id}:`, err)
        await supabase.from('reply_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', item.id)
      }
    }
  }

  // 1. Process missing drafts for enrollments
  const { data: missingDraftEnrollments } = await supabase
    .from('followup_enrollments')
    .select('*, leads(*), followup_sequences(*)')
    .eq('status', 'active')
    .is('draft_message', null)
    .limit(10)

  if (missingDraftEnrollments && missingDraftEnrollments.length > 0) {
    for (const enrollment of missingDraftEnrollments) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) break;
      const lead = enrollment.leads
      const sequence = enrollment.followup_sequences
      const steps = sequence.steps as any[]
      const currentStepConfig = steps[enrollment.current_step - 1]
      
      try {
        const message = await runFollowupAgent(
          lead,
          enrollment.current_step,
          steps.length,
          currentStepConfig?.custom_message
        )
        if (message) {
          await supabase.from('followup_enrollments').update({ draft_message: message }).eq('id', enrollment.id)
        } else {
          await supabase.from('followup_enrollments').update({ status: 'completed' }).eq('id', enrollment.id)
        }
      } catch (e: any) {
        console.error('Failed to generate draft', e)
        await supabase.from('followup_enrollments').update({ 
          status: 'failed', 
          error_message: e.message 
        }).eq('id', enrollment.id)
      }
    }
  }

  // 2. Get due enrollments that HAVE drafts
  const { data: enrollments, error } = await supabase
    .from('followup_enrollments')
    .select(`
      *,
      leads(*),
      followup_sequences(*)
    `)
    .eq('status', 'active')
    .not('draft_message', 'is', null)
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

    // e. Get message (must be available)
    const message = enrollment.draft_message

    // f. If Done signal (should not happen if draft exists, but just in case)
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
      let newDraftMessage = null
      let newErrorMessage = null

      if (nextStepConfig) {
        newNextSendAt = calculateNextSendAt(nextStepConfig, timezone, windowStart, windowEnd).toISOString()
        // Generate draft for the next step immediately
        try {
          const nextMessage = await runFollowupAgent(
            lead,
            enrollment.current_step + 1,
            steps.length,
            nextStepConfig.custom_message
          )
          if (nextMessage) {
            newDraftMessage = nextMessage
          } else {
            newStatus = 'completed' // AI said done
          }
        } catch (e: any) {
          newStatus = 'failed'
          newErrorMessage = e.message
        }
      } else {
        newStatus = 'completed'
      }

      await supabase.from('followup_enrollments').update({
        current_step: enrollment.current_step + 1,
        status: newStatus,
        next_send_at: newNextSendAt,
        draft_message: newDraftMessage,
        error_message: newErrorMessage,
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
