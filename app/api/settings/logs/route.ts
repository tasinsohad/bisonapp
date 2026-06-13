import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch failed agent runs
  const { data: agentRuns, error: agentError } = await supabase
    .from('agent_runs')
    .select('id, lead_id, agent_type, error_message, created_at')
    .eq('success', false)
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch webhook logs with errors
  const { data: webhookLogs, error: webhookError } = await supabase
    .from('webhook_logs')
    .select('id, provider, error_message, created_at')
    .not('error_message', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (agentError) console.error('Agent logs error:', agentError)
  if (webhookError) console.error('Webhook logs error:', webhookError)

  // Combine and format
  const combinedLogs: any[] = []

  if (agentRuns) {
    agentRuns.forEach((run: any) => {
      combinedLogs.push({
        id: `agent_${run.id}`,
        source: `AI Agent (${run.agent_type})`,
        error_message: run.error_message,
        created_at: run.created_at,
        lead_id: run.lead_id
      })
    })
  }

  if (webhookLogs) {
    webhookLogs.forEach((log: any) => {
      combinedLogs.push({
        id: `webhook_${log.id}`,
        source: `Webhook (${log.provider})`,
        error_message: log.error_message,
        created_at: log.created_at,
        lead_id: null
      })
    })
  }

  // Sort chronologically descending
  combinedLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ data: combinedLogs.slice(0, 100) })
}
