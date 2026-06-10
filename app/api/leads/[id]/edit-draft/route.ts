import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, type, newDraftMessage } = await request.json()

    if (!id || !type || newDraftMessage === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type === 'ai_reply') {
      const { error } = await supabase
        .from('reply_queue')
        .update({ draft_message: newDraftMessage, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    } else if (type === 'followup') {
      const { error } = await supabase
        .from('followup_enrollments')
        .update({ draft_message: newDraftMessage, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
