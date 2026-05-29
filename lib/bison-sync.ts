import { getSettings } from '@/lib/settings'
import { createServerClient } from '@/lib/supabase/server'

interface Lead {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  bison_reply_id: number | null
  bison_sender_email_id: number | null
  bison_sender_email_address: string | null
  bison_instance_url: string | null
  status: string
}

export async function syncLeadThread(lead: Lead): Promise<{ success: boolean; hasNewReply: boolean; error?: string }> {
  const supabase = createServerClient()
  
  try {
    if (!lead.bison_reply_id) {
      return { success: false, hasNewReply: false, error: 'Lead has no bison_reply_id' }
    }

    const settings = await getSettings()
    const instanceUrl = lead.bison_instance_url || settings.bison_instance_url
    const apiKey = settings.bison_api_key

    if (!instanceUrl || !apiKey) {
      return { success: false, hasNewReply: false, error: 'Missing Bison instance URL or API key in settings' }
    }

    // Call Bison GET /api/replies/{reply_id}/conversation-thread
    const url = `${instanceUrl}/api/replies/${lead.bison_reply_id}/conversation-thread`
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      return { success: false, hasNewReply: false, error: `Bison thread API error (${res.status}): ${errorText}` }
    }

    const json = await res.json()
    const threadData = json?.data

    if (!threadData) {
      return { success: false, hasNewReply: false, error: 'Bison thread API returned empty data' }
    }

    // Chronological collection of all messages in the thread
    const rawMessages: any[] = []
    if (threadData.older_messages) rawMessages.push(...threadData.older_messages)
    if (threadData.current_reply) rawMessages.push(threadData.current_reply)
    if (threadData.newer_messages) rawMessages.push(...threadData.newer_messages)

    const sortedMessages = rawMessages
      .filter(m => m && (m.text_body || m.html_body || m.id))
      .sort((a, b) => new Date(a.date_received || 0).getTime() - new Date(b.date_received || 0).getTime())

    if (sortedMessages.length === 0) {
      return { success: true, hasNewReply: false }
    }

    const lastMessage = sortedMessages[sortedMessages.length - 1]
    
    // Check who sent the last message
    const lastSenderEmail = lastMessage.from_email_address || ''
    const ourSenderEmail = lead.bison_sender_email_address || ''
    
    // Last message is from us if it matches our outreach sender email address
    const lastMessageIsFromUs = lastSenderEmail.toLowerCase().trim() === ourSenderEmail.toLowerCase().trim()
    
    // The prospect has replied if the last message is NOT from us
    const hasNewReply = !lastMessageIsFromUs

    // Sync missing messages
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, messages')
      .eq('lead_id', lead.id)
      .single()

    const localMessages = conv?.messages || []
    const newLocalMessages = [...localMessages]
    let updatedReplyId = lead.bison_reply_id
    let newlyDiscoveredMessagesCount = 0

    for (const m of sortedMessages) {
      const exists = localMessages.some((lm: any) => 
        lm.bison_reply_id === m.id || 
        (lm.timestamp && new Date(lm.timestamp).getTime() === new Date(m.date_received).getTime())
      )

      if (!exists) {
        newlyDiscoveredMessagesCount++
        const isFromUs = (m.from_email_address || '').toLowerCase().trim() === ourSenderEmail.toLowerCase().trim()
        
        newLocalMessages.push({
          role: isFromUs ? 'outbound' : 'inbound',
          content: m.text_body || '',
          html: m.html_body || '',
          from_name: m.from_name || '',
          from_email: m.from_email_address || '',
          timestamp: m.date_received || new Date().toISOString(),
          bison_reply_id: m.id,
          source: 'sync',
        })

        // Insert to email_logs if missing
        const { data: logExists } = await supabase
          .from('email_logs')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('bison_reply_id', m.id)
          .maybeSingle()

        if (!logExists) {
          await supabase.from('email_logs').insert({
            lead_id: lead.id,
            direction: isFromUs ? 'outbound' : 'inbound',
            subject: m.email_subject || 'Re: outreach',
            body_text: m.text_body || '',
            body_html: m.html_body || '',
            bison_reply_id: m.id,
            bison_sender_email_id: lead.bison_sender_email_id,
            bison_sender_email_address: m.from_email_address,
            status: 'delivered',
            sent_at: m.date_received || new Date().toISOString(),
          })
        }

        // Add to activity feed if we discovered an inbound reply
        if (!isFromUs) {
          await supabase.from('activity_feed').insert({
            lead_id: lead.id,
            lead_email: lead.email,
            lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
            event_type: 'reply_received',
            description: `Discovered new reply via Thread Sync from ${m.from_name || m.from_email_address}: "${(m.text_body || '').substring(0, 100)}..."`,
            metadata: { source: 'sync', reply_id: m.id },
          })
        }

        if (m.id > (updatedReplyId || 0)) {
          updatedReplyId = m.id
        }
      }
    }

    // Save synced conversations
    if (newlyDiscoveredMessagesCount > 0) {
      if (conv) {
        await supabase
          .from('conversations')
          .update({
            messages: newLocalMessages,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', conv.id)
      } else {
        await supabase
          .from('conversations')
          .insert({
            lead_id: lead.id,
            messages: newLocalMessages,
            last_activity_at: new Date().toISOString(),
          })
      }
    }

    // If prospect replied, perform actions (pause enrollment, update lead status/reply ID)
    if (hasNewReply) {
      // Pause active follow-up enrollment if auto pause is enabled
      if (settings.auto_pause_on_reply === 'true') {
        const { data: updatedEnrollments } = await supabase
          .from('followup_enrollments')
          .update({
            status: 'paused',
            updated_at: new Date().toISOString()
          })
          .eq('lead_id', lead.id)
          .eq('status', 'active')
          .select()

        if (updatedEnrollments && updatedEnrollments.length > 0) {
          await supabase.from('activity_feed').insert({
            lead_id: lead.id,
            lead_email: lead.email,
            lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
            event_type: 'status_changed',
            description: `Follow-up sequence automatically paused via Thread Sync detection`,
            metadata: { source: 'sync' }
          })
        }
      }

      // Update lead record
      await supabase
        .from('leads')
        .update({
          bison_reply_id: updatedReplyId,
          status: lead.status === 'new' ? 'engaged' : lead.status, // Move 'new' to 'engaged'
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id)
    } else if (newlyDiscoveredMessagesCount > 0) {
      // Just update lead metadata if we sent outbound messages
      await supabase
        .from('leads')
        .update({
          bison_reply_id: updatedReplyId,
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id)
    }

    return { success: true, hasNewReply }
  } catch (error: any) {
    console.error('Thread sync error:', error)
    return { success: false, hasNewReply: false, error: error.message }
  }
}
