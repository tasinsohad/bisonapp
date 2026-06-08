/**
 * Core Email Sending Utility
 * 
 * CRITICAL: sender_email_id is ALWAYS read from the lead record
 * (stored from webhook payload). It is NEVER hardcoded or configured globally.
 * 
 * bison_reply_id is the latest reply.id from the most recent inbound webhook,
 * used as the thread parent for the reply API call.
 */

import { getSettings } from '@/lib/settings'
import { createAdminClient } from '@/lib/supabase/server'

interface Lead {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  bison_reply_id: number | null
  bison_sender_email_id: number | null  // DYNAMIC — from webhook, never hardcoded
  bison_sender_email_name: string | null
  bison_sender_email_address: string | null
  bison_instance_url: string | null
}

interface SendEmailResult {
  success: boolean
  error?: string
  data?: any
}

/**
 * Send a reply to a lead via Email Bison
 * 
 * Uses the lead's stored bison_reply_id as the thread parent
 * and bison_sender_email_id as the sender identity.
 * Both are populated from webhook data — never from config.
 */
export async function sendBisonEmail({
  lead,
  messageText,
}: {
  lead: Lead
  messageText: string
}): Promise<SendEmailResult> {
  const supabase = createAdminClient()

  try {
    // Validate required lead fields
    if (!lead.bison_reply_id) {
      return { success: false, error: 'Lead has no bison_reply_id — cannot send without a reply thread parent' }
    }
    if (!lead.bison_sender_email_id) {
      return { success: false, error: 'Lead has no bison_sender_email_id — cannot send without knowing which sender to use' }
    }

    // Load settings dynamically
    const settings = await getSettings()
    const instanceUrl = lead.bison_instance_url || settings.bison_instance_url
    const apiKey = settings.bison_api_key

    if (!instanceUrl || !apiKey) {
      return { success: false, error: 'Missing Email Bison instance URL or API key in settings' }
    }

    // Convert plain text to HTML: \n → <br>
    const htmlMessage = '<p>' + messageText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>') + '</p>'

    // Build CC emails from settings
    const ccEmails: { name: string; email_address: string }[] = []
    if (settings.cc_email_address) {
      ccEmails.push({
        name: settings.cc_email_name || '',
        email_address: settings.cc_email_address,
      })
    }

    // Build the request body
    const body = {
      message: htmlMessage,
      sender_email_id: lead.bison_sender_email_id, // ← ALWAYS from lead record (webhook data)
      to_emails: [
        {
          name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email,
          email_address: lead.email,
        },
      ],
      inject_previous_email_body: true,
      content_type: 'html',
      use_dedicated_ips: false,
      cc_emails: ccEmails,
    }

    // POST {instance_url}/api/replies/{reply_id}/reply
    const url = `${instanceUrl}/api/replies/${lead.bison_reply_id}/reply`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      const errorMsg = `Bison reply API error (${response.status}): ${errorText}`
      console.error(errorMsg)

      // Log failed email
      await supabase.from('email_logs').insert({
        lead_id: lead.id,
        direction: 'outbound',
        body_text: messageText,
        body_html: htmlMessage,
        bison_reply_id: lead.bison_reply_id,
        bison_sender_email_id: lead.bison_sender_email_id,
        bison_sender_email_address: lead.bison_sender_email_address,
        status: 'failed',
        error_message: errorMsg,
      })

      return { success: false, error: errorMsg }
    }

    const responseData = await response.json()

    // Log successful email
    await supabase.from('email_logs').insert({
      lead_id: lead.id,
      direction: 'outbound',
      body_text: messageText,
      body_html: htmlMessage,
      bison_reply_id: lead.bison_reply_id,
      bison_sender_email_id: lead.bison_sender_email_id,
      bison_sender_email_address: lead.bison_sender_email_address,
      status: 'sent',
    })

    return { success: true, data: responseData }
  } catch (error: any) {
    const errorMsg = `sendBisonEmail exception: ${error.message}`
    console.error(errorMsg)

    // Log error — never throw
    try {
      await supabase.from('email_logs').insert({
        lead_id: lead.id,
        direction: 'outbound',
        body_text: messageText,
        bison_reply_id: lead.bison_reply_id,
        bison_sender_email_id: lead.bison_sender_email_id,
        bison_sender_email_address: lead.bison_sender_email_address,
        status: 'failed',
        error_message: errorMsg,
      })
    } catch {
      // Never fail on logging
    }

    return { success: false, error: errorMsg }
  }
}
