/**
 * Email Bison API Client
 * 
 * All API calls use dynamic instance URL from settings.
 * sender_email_id is ALWAYS read from the lead record (from webhook), never hardcoded.
 */

interface BisonApiOptions {
  instanceUrl: string
  apiKey: string
}

interface ConversationThreadResponse {
  data: {
    older_messages: any[]
    current_reply: any
    newer_messages: any[]
  }
}

// Helper to safely strip trailing slashes to prevent HTTP 404 (e.g. //api/...)
const getBaseUrl = (url: string) => url.replace(/\/+$/, '')

/**
 * Fetch the full conversation thread for a reply
 * GET {instance_url}/api/replies/{reply_id}/conversation-thread
 */
export async function getConversationThread(
  opts: BisonApiOptions,
  replyId: number
): Promise<ConversationThreadResponse | null> {
  try {
    const response = await fetch(
      `${getBaseUrl(opts.instanceUrl)}/api/replies/${replyId}/conversation-thread`,
      {
        headers: {
          'Authorization': `Bearer ${opts.apiKey}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error(`Bison getConversationThread failed: ${response.status} ${response.statusText}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Bison getConversationThread error:', error)
    return null
  }
}

/**
 * Get all replies for a lead
 * GET {instance_url}/api/leads/{lead_id}/replies
 */
export async function getLeadReplies(
  opts: BisonApiOptions,
  leadId: number,
  filters?: { folder?: string; status?: string; campaign_id?: number; sender_email_id?: number }
): Promise<any[]> {
  const params = new URLSearchParams()
  if (filters?.folder) params.set('folder', filters.folder)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.campaign_id) params.set('campaign_id', String(filters.campaign_id))
  if (filters?.sender_email_id) params.set('sender_email_id', String(filters.sender_email_id))

  const url = `${getBaseUrl(opts.instanceUrl)}/api/leads/${leadId}/replies${params.toString() ? '?' + params : ''}`

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${opts.apiKey}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) return []
    const result = await response.json()
    return result.data || []
  } catch {
    return []
  }
}

/**
 * Get sent emails for a lead
 * GET {instance_url}/api/leads/{lead_id_or_email}/sent-emails
 */
export async function getLeadSentEmails(
  opts: BisonApiOptions,
  leadIdOrEmail: string | number
): Promise<any[]> {
  try {
    const response = await fetch(
      `${getBaseUrl(opts.instanceUrl)}/api/leads/${leadIdOrEmail}/sent-emails`,
      {
        headers: {
          'Authorization': `Bearer ${opts.apiKey}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) return []
    const result = await response.json()
    return result.data || []
  } catch {
    return []
  }
}

/**
 * Get lead details from Bison
 * GET {instance_url}/api/leads/{lead_id_or_email}
 */
export async function getLeadDetails(
  opts: BisonApiOptions,
  leadIdOrEmail: string | number
): Promise<any | null> {
  try {
    const response = await fetch(
      `${getBaseUrl(opts.instanceUrl)}/api/leads/${leadIdOrEmail}`,
      {
        headers: {
          'Authorization': `Bearer ${opts.apiKey}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) return null
    const result = await response.json()
    return result.data || result
  } catch {
    return null
  }
}

/**
 * Update a lead in Bison
 * PUT {instance_url}/api/leads/{lead_id}
 */
export async function updateBisonLead(
  opts: BisonApiOptions,
  leadId: number,
  data: {
    first_name?: string
    last_name?: string
    title?: string
    company?: string
    notes?: string
    custom_variables?: { name: string; value: string }[]
  }
): Promise<boolean> {
  try {
    const response = await fetch(
      `${getBaseUrl(opts.instanceUrl)}/api/leads/${leadId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${opts.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
      }
    )

    return response.ok
  } catch {
    return false
  }
}

/**
 * Test the Bison API connection
 * GET {instance_url}/api/users
 */
export async function testBisonConnection(
  opts: BisonApiOptions
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const response = await fetch(`${getBaseUrl(opts.instanceUrl)}/api/users`, {
      headers: {
        'Authorization': `Bearer ${opts.apiKey}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Connection failed' }
  }
}
