import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { saveSettings } from '@/lib/settings'
import { DEFAULT_APPT_SETTER_PROMPT, DEFAULT_FOLLOWUP_PROMPT } from '@/lib/default-prompts'

/**
 * POST /api/settings/reset-prompts
 * Resets both AI prompts to the V2 defaults directly in the database.
 */
export async function POST() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await saveSettings({
      appt_setter_system_prompt: DEFAULT_APPT_SETTER_PROMPT,
      followup_agent_system_prompt: DEFAULT_FOLLOWUP_PROMPT,
    })

    return NextResponse.json({ 
      success: true,
      appt_setter_system_prompt: DEFAULT_APPT_SETTER_PROMPT,
      followup_agent_system_prompt: DEFAULT_FOLLOWUP_PROMPT,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
