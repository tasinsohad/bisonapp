/**
 * Email Bison Webhook Receiver
 * 
 * POST /api/webhooks/bison
 * 
 * CRITICAL:
 * - Returns 200 within 200ms — all processing is async
 * - Extracts bison_sender_email_id from data.sender_email.id (NEVER hardcoded)
 * - Updates bison_reply_id on EVERY inbound reply
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { runAppointmentSetter } from '@/lib/ai'
import { researchCompany } from '@/lib/firecrawl'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 1. HMAC verification (if webhook_secret is set)
  const settings = await getSettings()
  if (settings.webhook_secret) {
    const signature = request.headers.get('x-webhook-signature') || ''
    const expected = crypto
      .createHmac('sha256', settings.webhook_secret)
      .update(JSON.stringify(body))
      .digest('hex')

    if (signature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  // 2. Log raw payload immediately
  const eventType = body?.event?.type || 'UNKNOWN'
  await supabase.from('webhook_logs').insert({
    event_type: eventType,
    bison_instance_url: body?.event?.instance_url || '',
    bison_workspace_name: body?.event?.workspace_name || '',
    payload: body,
    processed: false,
  })

  // 3. Return 200 immediately — process async
  // Using waitUntil pattern via edge runtime or fire-and-forget
  processWebhookAsync(body, eventType, settings).catch(console.error)

  return NextResponse.json({ received: true }, { status: 200 })
}

async function processWebhookAsync(
  body: any,
  eventType: string,
  settings: Record<string, string>
) {
  const supabase = createServerClient()
  const data = body?.data

  if (!data) return

  try {
    switch (eventType) {
      case 'LEAD_INTERESTED':
      case 'CONTACT_REPLIED':
        await handleReply(supabase, body, data, settings, eventType)
        break

      case 'CONTACT_UNSUBSCRIBED':
        await handleUnsubscribe(supabase, data)
        break

      case 'EMAIL_BOUNCED':
        await handleBounce(supabase, data)
        break

      case 'EMAIL_OPENED':
        // Optional: just log it
        if (data.lead?.email) {
          await supabase.from('activity_feed').insert({
            lead_email: data.lead.email,
            lead_name: [data.lead.first_name, data.lead.last_name].filter(Boolean).join(' '),
            event_type: 'email_opened',
            description: `${data.lead.first_name || data.lead.email} opened an email`,
          })
        }
        break
    }

    // Mark webhook as processed
    await supabase
      .from('webhook_logs')
      .update({ processed: true })
      .eq('payload->>event->>type', eventType)
      .order('received_at', { ascending: false })
      .limit(1)
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    // Update webhook log with error
    await supabase
      .from('webhook_logs')
      .update({ error_message: error.message })
      .eq('payload->>event->>type', eventType)
      .order('received_at', { ascending: false })
      .limit(1)
  }
}

async function handleReply(
  supabase: any,
  body: any,
  data: any,
  settings: Record<string, string>,
  eventType: string
) {
  // ===== EXTRACT ALL FIELDS FROM WEBHOOK PAYLOAD =====
  const leadEmail = data.lead?.email
  if (!leadEmail) return

  const bisonLeadId = data.lead?.id
  // CRITICAL: bison_reply_id — used as thread parent for every reply API call
  const bisonReplyId = data.reply?.id
  // CRITICAL: bison_sender_email_id — DYNAMIC per thread, from webhook
  const bisonSenderEmailId = data.sender_email?.id
  const bisonSenderEmailName = data.sender_email?.name
  const bisonSenderEmailAddress = data.sender_email?.email

  const bisonCampaignId = data.campaign?.id
  const bisonCampaignName = data.campaign?.name
  const bisonInstanceUrl = body.event?.instance_url

  const firstName = data.lead?.first_name || null
  const lastName = data.lead?.last_name || null
  const title = data.lead?.title || null
  const company = data.lead?.company || null
  const customVariables = data.lead?.custom_variables || []

  const sequenceStepOrder = data.scheduled_email?.sequence_step_order || null

  const website = customVariables.find((v: any) => v.name === 'website')?.value || null
  const linkedinUrl = customVariables.find((v: any) => v.name === 'linkedin profile')?.value || null
  const industry = customVariables.find((v: any) => v.name === 'industry')?.value || null
  const country = customVariables.find((v: any) => v.name === 'country')?.value || null
  const annualRevenue = customVariables.find((v: any) => v.name === 'annual revenue')?.value || null

  const replyBodyText = data.reply?.text_body || ''
  const replyHtml = data.reply?.html_body || ''
  const replySubject = data.reply?.email_subject || ''
  const replyDate = data.reply?.date_received || new Date().toISOString()
  const fromName = data.reply?.from_name || ''
  const fromEmailAddress = data.reply?.from_email_address || leadEmail

  // ===== UPSERT LEAD =====
  // Check if lead exists by email
  const { data: existingLead } = await supabase
    .from('leads')
    .select('id')
    .eq('email', leadEmail)
    .single()

  let leadId: string

  if (existingLead) {
    // UPDATE existing lead — ALWAYS update bison_reply_id and bison_sender_email_id
    leadId = existingLead.id
    await supabase.from('leads').update({
      bison_reply_id: bisonReplyId,                     // ← CRITICAL: updated on every reply
      bison_sender_email_id: bisonSenderEmailId,       // ← CRITICAL: dynamic per thread
      bison_sender_email_name: bisonSenderEmailName,
      bison_sender_email_address: bisonSenderEmailAddress,
      bison_lead_id: bisonLeadId,
      bison_campaign_id: bisonCampaignId,
      bison_campaign_name: bisonCampaignName,
      bison_instance_url: bisonInstanceUrl,
      sequence_step_order: sequenceStepOrder,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', leadId)
  } else {
    // INSERT new lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        bison_lead_id: bisonLeadId,
        bison_reply_id: bisonReplyId,                   // ← stored from first webhook
        bison_sender_email_id: bisonSenderEmailId,     // ← stored from first webhook
        bison_sender_email_name: bisonSenderEmailName,
        bison_sender_email_address: bisonSenderEmailAddress,
        bison_campaign_id: bisonCampaignId,
        bison_campaign_name: bisonCampaignName,
        bison_instance_url: bisonInstanceUrl,
        email: leadEmail,
        first_name: firstName,
        last_name: lastName,
        title,
        company,
        website,
        linkedin_url: linkedinUrl,
        industry,
        country,
        annual_revenue: annualRevenue,
        custom_variables: customVariables,
        status: 'new',
        sequence_step_order: sequenceStepOrder,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to insert lead:', insertError)
      return
    }
    leadId = newLead.id

    // Activity feed: lead created
    await supabase.from('activity_feed').insert({
      lead_id: leadId,
      lead_email: leadEmail,
      lead_name: [firstName, lastName].filter(Boolean).join(' '),
      event_type: 'lead_created',
      description: `New lead: ${firstName || ''} ${lastName || ''} (${leadEmail}) from campaign "${bisonCampaignName || 'Unknown'}"`,
      metadata: { campaign: bisonCampaignName, sender: bisonSenderEmailAddress },
    })
  }

  // ===== UPSERT CONVERSATION =====
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id, messages')
    .eq('lead_id', leadId)
    .single()

  const newMessage = {
    role: 'inbound',
    content: replyBodyText,
    html: replyHtml,
    from_name: fromName,
    from_email: fromEmailAddress,
    timestamp: replyDate,
    bison_reply_id: bisonReplyId,
    source: 'webhook',
  }

  if (existingConv) {
    const messages = [...(existingConv.messages || []), newMessage]
    await supabase.from('conversations').update({
      messages,
      last_activity_at: new Date().toISOString(),
    }).eq('id', existingConv.id)
  } else {
    await supabase.from('conversations').insert({
      lead_id: leadId,
      messages: [newMessage],
    })
  }

  // ===== EMAIL LOG =====
  await supabase.from('email_logs').insert({
    lead_id: leadId,
    direction: 'inbound',
    subject: replySubject,
    body_text: replyBodyText,
    body_html: replyHtml,
    bison_reply_id: bisonReplyId,
    bison_sender_email_id: bisonSenderEmailId,
    bison_sender_email_address: fromEmailAddress,
    status: 'delivered',
  })

  // ===== ACTIVITY FEED =====
  await supabase.from('activity_feed').insert({
    lead_id: leadId,
    lead_email: leadEmail,
    lead_name: [firstName, lastName].filter(Boolean).join(' '),
    event_type: 'reply_received',
    description: `${fromName || leadEmail} replied: "${replyBodyText.substring(0, 100)}${replyBodyText.length > 100 ? '...' : ''}"`,
    metadata: { event_type: eventType, campaign: bisonCampaignName },
  })

  // ===== PAUSE FOLLOWUP IF auto_pause_on_reply =====
  if (eventType === 'LEAD_INTERESTED' && settings.auto_pause_on_reply === 'true') {
    await supabase.from('followup_enrollments').update({
      status: 'paused',
      updated_at: new Date().toISOString(),
    }).eq('lead_id', leadId).eq('status', 'active')
  }

  // ===== OPTIONAL: FIRECRAWL COMPANY RESEARCH =====
  if (website && settings.firecrawl_api_key && !existingLead) {
    // Fire and forget
    researchCompany(website, settings.firecrawl_api_key).then(async (result) => {
      if (result) {
        const { data: currentLead } = await supabase
          .from('leads')
          .select('custom_variables')
          .eq('id', leadId)
          .single()

        const vars = [...(currentLead?.custom_variables || []), {
          name: 'company_research',
          value: result,
        }]

        await supabase.from('leads').update({
          custom_variables: vars,
        }).eq('id', leadId)
      }
    }).catch(console.error)
  }

  // ===== TRIGGER APPOINTMENT SETTER (async) =====
  runAppointmentSetter(leadId).catch(console.error)
}

async function handleUnsubscribe(supabase: any, data: any) {
  const leadEmail = data.lead?.email
  if (!leadEmail) return

  const { data: lead } = await supabase
    .from('leads')
    .select('id, first_name, last_name')
    .eq('email', leadEmail)
    .single()

  if (!lead) return

  // Update lead status
  await supabase.from('leads').update({
    status: 'unsubscribed',
    updated_at: new Date().toISOString(),
  }).eq('id', lead.id)

  // Cancel followup enrollments
  await supabase.from('followup_enrollments').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('lead_id', lead.id).eq('status', 'active')

  // Activity feed
  await supabase.from('activity_feed').insert({
    lead_id: lead.id,
    lead_email: leadEmail,
    lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
    event_type: 'status_changed',
    description: `${lead.first_name || leadEmail} unsubscribed`,
  })
}

async function handleBounce(supabase: any, data: any) {
  const leadEmail = data.lead?.email
  if (!leadEmail) return

  const { data: lead } = await supabase
    .from('leads')
    .select('id, first_name, last_name')
    .eq('email', leadEmail)
    .single()

  if (!lead) return

  await supabase.from('leads').update({
    status: 'done',
    notes: 'Email bounced',
    updated_at: new Date().toISOString(),
  }).eq('id', lead.id)

  await supabase.from('activity_feed').insert({
    lead_id: lead.id,
    lead_email: leadEmail,
    lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
    event_type: 'status_changed',
    description: `Email bounced for ${leadEmail}`,
  })
}

// Ensure this runs as Node.js runtime (not Edge) for crypto support
export const runtime = 'nodejs'

// Disable body parsing to access raw body for HMAC
export const dynamic = 'force-dynamic'
