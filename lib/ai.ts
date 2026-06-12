/**
 * AI Agent Module
 * 
 * Handles appointment setter and follow-up agent logic.
 * Uses OpenAI SDK with configurable model from settings.
 */

import { getSettings } from '@/lib/settings'
import { createAdminClient } from '@/lib/supabase/server'
import { getConversationThread } from '@/lib/bison'
import { cleanThread } from '@/lib/thread-cleaner'
import { sendBisonEmail } from '@/lib/send-email'
import { bookCalMeeting } from '@/lib/cal'
import { calculateNextSendAt } from '@/lib/followup-scheduler'

interface Lead {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  title: string | null
  company: string | null
  website: string | null
  industry: string | null
  country: string | null
  linkedin_url: string | null
  annual_revenue: string | null
  custom_variables: any[]
  bison_lead_id: number | null
  bison_reply_id: number | null
  bison_sender_email_id: number | null
  bison_sender_email_name: string | null
  bison_sender_email_address: string | null
  bison_campaign_id: number | null
  bison_campaign_name: string | null
  bison_instance_url: string | null
  status: string
}

interface AgentAction {
  action: 'SEND_LINK' | 'ASK_TIME' | 'BOOK_MEETING' | 'DONE' | 'REPLY_ONLY'
  message: string
  proposedDateTime?: string
  reason: string
}

/**
 * Inject template variables into a prompt string
 */
function injectVariables(
  template: string,
  lead: Lead,
  settings: Record<string, string>,
  conversationThread: string,
  extra?: { stepNumber?: number; totalSteps?: number }
): string {
  const companyName = lead.company
    || (lead.custom_variables || []).find((v: any) => v.name === 'company name for emails')?.value
    || ''

  const companyResearch = (lead.custom_variables || []).find((v: any) => v.name === 'company_research')?.value || 'Not available'

  return template
    .replace(/\{\{leadFirstName\}\}/g, lead.first_name || lead.email.split('@')[0])
    .replace(/\{\{leadName\}\}/g, [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email)
    .replace(/\{\{leadEmail\}\}/g, lead.email)
    .replace(/\{\{leadCompany\}\}/g, companyName)
    .replace(/\{\{leadTitle\}\}/g, lead.title || '')
    .replace(/\{\{leadWebsite\}\}/g, lead.website || '')
    .replace(/\{\{leadIndustry\}\}/g, lead.industry || '')
    .replace(/\{\{leadCountry\}\}/g, lead.country || '')
    .replace(/\{\{calLink\}\}/g, settings.cal_booking_base_url || '')
    .replace(/\{\{companyResearch\}\}/g, companyResearch)
    .replace(/\{\{conversationThread\}\}/g, conversationThread)
    .replace(/\{\{senderName\}\}/g, lead.bison_sender_email_name || '')
    .replace(/\{\{senderEmail\}\}/g, lead.bison_sender_email_address || '')
    .replace(/\{\{campaignName\}\}/g, lead.bison_campaign_name || '')
    .replace(/\{\{stepNumber\}\}/g, String(extra?.stepNumber || ''))
    .replace(/\{\{totalSteps\}\}/g, String(extra?.totalSteps || ''))
}

/**
 * Parse JSON from AI response, with one retry
 */
function parseAgentJSON(raw: string): AgentAction | null {
  // Try to extract JSON from the response
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (parsed.action && typeof parsed.message === 'string') {
      return parsed as AgentAction
    }
    return null
  } catch {
    return null
  }
}

/**
 * Run the Appointment Setter Agent
 * 
 * Triggered by webhook. Reads conversation from Bison API,
 * cleans thread, runs through OpenAI, executes the decided action.
 */
export async function runAppointmentSetter(leadId: string, queueId?: string): Promise<boolean> {
  const supabase = createAdminClient()
  const settings = await getSettings()

  // Load lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    console.error('Failed to load lead for appointment setter:', leadError)
    return false
  }

  // Skip if lead doesn't have required Bison data
  if (!lead.bison_reply_id || !lead.bison_sender_email_id) {
    console.error(`Lead ${leadId} missing bison_reply_id or bison_sender_email_id`)
    return false
  }

  const instanceUrl = lead.bison_instance_url || settings.bison_instance_url
  const apiKey = settings.bison_api_key

  if (!instanceUrl || !apiKey) {
    console.error('Missing Bison instance URL or API key')
    return false
  }

  // Fetch conversation thread from Bison
  const threadData = await getConversationThread(
    { instanceUrl, apiKey },
    lead.bison_reply_id // ← Uses the LATEST reply ID from the lead record
  )

  let conversationText = ''
  if (threadData?.data) {
    conversationText = cleanThread(threadData.data)
  }

  // Load and inject system prompt
  let systemPrompt = settings.appt_setter_system_prompt
  if (!systemPrompt) {
    console.error('No appointment setter system prompt configured')
    return false
  }

  systemPrompt = injectVariables(systemPrompt, lead, settings, conversationText)

  // Call AI LLM
  const provider = settings.ai_provider || 'openai'
  const model = settings.ai_model || settings.openai_model || 'gpt-4o'
  
  const getActiveKey = () => {
    switch (provider) {
      case 'openai': return settings.openai_api_key || ''
      case 'gemini': return settings.gemini_api_key || ''
      case 'anthropic': return settings.anthropic_api_key || ''
      case 'openrouter': return settings.openrouter_api_key || ''
      case 'custom': return settings.custom_api_key || ''
      default: return ''
    }
  }
  
  const aiApiKey = getActiveKey()
  const customBaseUrl = settings.custom_base_url

  if (!aiApiKey && provider !== 'openrouter') {
    console.error(`No API key configured for provider: ${provider}`)
    return false
  }

  let rawResponse = ''
  let parsedAction: AgentAction | null = null

  try {
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is the current email thread:\n\n${conversationText}` },
    ]

    // First attempt
    rawResponse = await callLLM(provider, aiApiKey, model, messages, customBaseUrl)
    parsedAction = parseAgentJSON(rawResponse)

    // Retry if parsing failed
    if (!parsedAction) {
      messages.push({ role: 'assistant' as const, content: rawResponse })
      messages.push({
        role: 'user' as const,
        content: 'IMPORTANT: Return ONLY valid JSON, nothing else. No markdown, no code fences.',
      })
      rawResponse = await callLLM(provider, aiApiKey, model, messages, customBaseUrl)
      parsedAction = parseAgentJSON(rawResponse)
    }
  } catch (error: any) {
    // Log failed run
    await supabase.from('agent_runs').insert({
      lead_id: leadId,
      agent_type: 'appointment_setter',
      input_prompt: systemPrompt.substring(0, 2000),
      raw_response: rawResponse || error.message,
      success: false,
      error_message: error.message,
    })
    return false
  }

  // Log agent run
  await supabase.from('agent_runs').insert({
    lead_id: leadId,
    agent_type: 'appointment_setter',
    input_prompt: systemPrompt.substring(0, 2000),
    raw_response: rawResponse,
    parsed_action: parsedAction?.action || 'PARSE_FAILED',
    parsed_message: parsedAction?.message || '',
    success: !!parsedAction,
    error_message: parsedAction ? null : 'Failed to parse JSON response',
  })

  if (!parsedAction) {
    console.error('Failed to parse appointment setter response after retry')
    if (queueId) {
      await supabase.from('reply_queue').update({ status: 'failed' }).eq('id', queueId)
    }
    return false
  }

  // If a queueId is provided, we save the draft and stop here.
  // Exception: If the action is DONE, we can just execute it immediately to cancel follow-ups
  // and mark the lead as done, since no email is being sent anyway.
  if (queueId && parsedAction.action !== 'DONE') {
    await supabase.from('reply_queue').update({
      status: 'pending',
      draft_message: parsedAction.message,
      action_payload: parsedAction
    }).eq('id', queueId)
    
    // Also notify activity feed that draft is ready
    await supabase.from('activity_feed').insert({
      lead_id: leadId,
      lead_email: lead.email,
      lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
      event_type: 'status_changed',
      description: `AI draft generated and pending review/send.`,
    })

    return true
  }

  // Execute the action (Immediate Send)
  return await executeAgentAction(supabase, settings, leadId, lead, parsedAction, parsedAction.message, queueId)
}

/**
 * Executes a parsed AI action (used for immediate sends and processing drafted queues)
 */
async function executeAgentAction(
  supabase: any,
  settings: any,
  leadId: string,
  lead: Lead,
  parsedAction: AgentAction,
  messageTextToSend: string,
  queueId?: string
): Promise<boolean> {
  switch (parsedAction.action) {
    case 'SEND_LINK':
    case 'ASK_TIME':
    case 'REPLY_ONLY': {
      const result = await sendBisonEmail({ lead, messageText: messageTextToSend })

      if (result.success) {
        // Append outbound message to conversation
        await appendOutboundMessage(supabase, lead, messageTextToSend)

        // Update status for SEND_LINK and ASK_TIME
        if (parsedAction.action !== 'REPLY_ONLY') {
          await supabase.from('leads').update({
            status: 'engaged',
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', leadId)
          
          // Automatically enroll in default follow-up sequence
          const defaultSequenceId = settings.default_sequence_id
          if (defaultSequenceId) {
            const { data: existingEnrollment } = await supabase
              .from('followup_enrollments')
              .select('id')
              .eq('lead_id', leadId)
              .in('status', ['active', 'paused'])
              .single()
              
            if (!existingEnrollment) {
              const { data: sequence } = await supabase
                .from('followup_sequences')
                .select('steps')
                .eq('id', defaultSequenceId)
                .single()
                
              if (sequence?.steps && (sequence.steps as any[]).length > 0) {
                const stepConfig = (sequence.steps as any[])[0]
                const timezone = settings.app_timezone || 'America/New_York'
                const windowStart = parseInt(settings.send_window_start || '9')
                const windowEnd = parseInt(settings.send_window_end || '18')
                
                const nextSend = calculateNextSendAt(stepConfig, timezone, windowStart, windowEnd)
                
                await supabase.from('followup_enrollments').insert({
                  lead_id: leadId,
                  sequence_id: defaultSequenceId,
                  current_step: 1,
                  status: 'active',
                  next_send_at: nextSend.toISOString()
                })
              }
            }
          }
        }

        // Activity feed
        await supabase.from('activity_feed').insert({
          lead_id: leadId,
          lead_email: lead.email,
          lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
          event_type: 'email_sent',
          description: `AI ${parsedAction.action}: ${parsedAction.reason || 'Email sent'}`,
          metadata: { action: parsedAction.action, agent: 'appointment_setter' },
        })
        return true
      }
      return false
    }

    case 'BOOK_MEETING': {
      // Try to book via Cal.com
      let bookingSuccess = false
      if (parsedAction.proposedDateTime && settings.cal_api_key) {
        const bookResult = await bookCalMeeting({
          lead,
          proposedDateTime: parsedAction.proposedDateTime,
          calApiKey: settings.cal_api_key,
          calEventTypeId: settings.cal_event_type_id,
        })

        if (bookResult.success) {
          bookingSuccess = true
          // Insert meeting record
          await supabase.from('meetings').insert({
            lead_id: leadId,
            scheduled_at: parsedAction.proposedDateTime,
            cal_event_id: bookResult.eventId,
            cal_booking_url: bookResult.bookingUrl,
            status: 'confirmed',
          })
        }
      }

      // Send confirmation email
      const result = await sendBisonEmail({ lead, messageText: messageTextToSend })
      if (result.success) {
        await appendOutboundMessage(supabase, lead, messageTextToSend)

        // Update lead status
        await supabase.from('leads').update({
          status: 'meeting_scheduled',
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', leadId)

        // Cancel followup enrollments
        await supabase.from('followup_enrollments').update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        }).eq('lead_id', leadId).eq('status', 'active')

        // Activity feed
        await supabase.from('activity_feed').insert({
          lead_id: leadId,
          lead_email: lead.email,
          lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
          event_type: 'meeting_booked',
          description: `Meeting ${bookingSuccess ? 'booked' : 'proposed'}: ${parsedAction.reason}`,
          metadata: { action: 'BOOK_MEETING', proposedDateTime: parsedAction.proposedDateTime },
        })
        return true
      }
      return false
    }

    case 'DONE': {
      // No email sent — just update status
      await supabase.from('leads').update({
        status: 'done',
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', leadId)

      // Cancel followup enrollments
      await supabase.from('followup_enrollments').update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      }).eq('lead_id', leadId).eq('status', 'active')

      // Activity feed
      await supabase.from('activity_feed').insert({
        lead_id: leadId,
        lead_email: lead.email,
        lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
        event_type: 'agent_decision',
        description: `Appointment setter marked DONE: ${parsedAction.reason}`,
        metadata: { action: 'DONE', agent: 'appointment_setter' },
      })
      return true
    }
    
    default:
      return false
  }
}

/**
 * Execute a drafted reply from the queue
 */
export async function executeDraftedQueueItem(queueId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const settings = await getSettings()

  const { data: queueItem, error: queueError } = await supabase
    .from('reply_queue')
    .select('*, leads(*)')
    .eq('id', queueId)
    .single()

  if (queueError || !queueItem || !queueItem.leads || !queueItem.action_payload) {
    console.error('Failed to load queue item for execution:', queueError)
    await supabase.from('reply_queue').update({ status: 'failed' }).eq('id', queueId)
    return false
  }

  const parsedAction = queueItem.action_payload as AgentAction
  const messageTextToSend = queueItem.draft_message || parsedAction.message

  // Execute
  const success = await executeAgentAction(
    supabase, 
    settings, 
    queueItem.lead_id, 
    queueItem.leads, 
    parsedAction, 
    messageTextToSend,
    queueId
  )

  if (success) {
    await supabase.from('reply_queue').update({ status: 'completed' }).eq('id', queueId)
  } else {
    await supabase.from('reply_queue').update({ status: 'failed' }).eq('id', queueId)
  }

  return success
}

/**
 * Run the Follow-up Agent
 * Returns the message text, or null if the lead should stop receiving follow-ups
 */
export async function runFollowupAgent(
  lead: Lead,
  stepNumber: number,
  totalSteps: number,
  customMessage?: string
): Promise<string | null> {
  // If there's a custom message, use it directly
  if (customMessage && customMessage.trim()) {
    return customMessage.trim()
  }

  const settings = await getSettings()
  const instanceUrl = lead.bison_instance_url || settings.bison_instance_url
  const apiKey = settings.bison_api_key

  // Fetch conversation thread
  let conversationText = ''
  if (lead.bison_reply_id && instanceUrl && apiKey) {
    const threadData = await getConversationThread(
      { instanceUrl, apiKey },
      lead.bison_reply_id
    )
    if (threadData?.data) {
      conversationText = cleanThread(threadData.data)
    }
  }

  // Load and inject follow-up prompt
  let systemPrompt = settings.followup_agent_system_prompt
  if (!systemPrompt) return null

  systemPrompt = injectVariables(systemPrompt, lead, settings, conversationText, {
    stepNumber,
    totalSteps,
  })

  // Call AI LLM
  const provider = settings.ai_provider || 'openai'
  const model = settings.ai_model || settings.openai_model || 'gpt-4o'
  
  const getActiveKey = () => {
    switch (provider) {
      case 'openai': return settings.openai_api_key || ''
      case 'gemini': return settings.gemini_api_key || ''
      case 'anthropic': return settings.anthropic_api_key || ''
      case 'openrouter': return settings.openrouter_api_key || ''
      case 'custom': return settings.custom_api_key || ''
      default: return ''
    }
  }
  
  const aiApiKey = getActiveKey()
  const customBaseUrl = settings.custom_base_url

  if (!aiApiKey && provider !== 'openrouter') return null

  const supabase = createAdminClient()

  try {
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `Write follow-up email #${stepNumber} of ${totalSteps}.` },
    ]

    const rawResponse = await callLLM(provider, aiApiKey, model, messages, customBaseUrl)

    // Log agent run
    await supabase.from('agent_runs').insert({
      lead_id: lead.id,
      agent_type: 'followup',
      input_prompt: systemPrompt.substring(0, 2000),
      raw_response: rawResponse,
      parsed_action: rawResponse.trim().toLowerCase() === 'done' ? 'DONE' : 'FOLLOWUP',
      parsed_message: rawResponse,
      success: true,
    })

    // Check if AI says "Done"
    if (rawResponse.trim().toLowerCase() === 'done') {
      return null
    }

    return rawResponse.trim()
  } catch (error: any) {
    await supabase.from('agent_runs').insert({
      lead_id: lead.id,
      agent_type: 'followup',
      input_prompt: systemPrompt.substring(0, 2000),
      raw_response: error.message,
      success: false,
      error_message: error.message,
    })
    return null
  }
}

/**
 * Call the selected LLM provider (OpenAI, Gemini, Anthropic, OpenRouter, Custom)
 */
async function callLLM(
  provider: string,
  apiKey: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  customBaseUrl?: string
): Promise<string> {
  if (!apiKey && provider !== 'openrouter') {
    throw new Error(`API key is missing for provider: ${provider}`)
  }

  // 1. Anthropic Claude Custom Handler
  if (provider === 'anthropic') {
    const systemMessage = messages.find((m) => m.role === 'system')
    const systemPrompt = systemMessage ? systemMessage.content : ''
    const userMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role,
        content: m.content,
      }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-latest',
        messages: userMessages,
        system: systemPrompt,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    return data.content?.[0]?.text || ''
  }

  // 2. OpenAI Compatible Providers (OpenAI, Gemini, OpenRouter, Custom)
  let endpoint = 'https://api.openai.com/v1/chat/completions'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  if (provider === 'openai') {
    endpoint = 'https://api.openai.com/v1/chat/completions'
  } else if (provider === 'gemini') {
    endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
  } else if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions'
  } else if (provider === 'custom') {
    if (!customBaseUrl) {
      throw new Error('Custom provider selected but no Base URL was provided.')
    }
    const baseUrl = customBaseUrl.endsWith('/') ? customBaseUrl.slice(0, -1) : customBaseUrl
    endpoint = `${baseUrl}/chat/completions`
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${provider} API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}


/**
 * Append an outbound message to the lead's conversation record
 */
async function appendOutboundMessage(
  supabase: any,
  lead: Lead,
  messageText: string
) {
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, messages')
    .eq('lead_id', lead.id)
    .single()

  if (conv) {
    const messages = [...(conv.messages || []), {
      role: 'outbound',
      content: messageText,
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
}
