import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, type, newDate } = await request.json()

  if (!id || !type || !newDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Ensure newDate is a valid date string
  const parsedDate = new Date(newDate)
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }

  if (type === 'ai_reply') {
    // Update reply_queue send_after
    const { data, error } = await supabase
      .from('reply_queue')
      .update({ send_after: parsedDate.toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('lead_id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })

  } else if (type === 'followup') {
    // Update followup_enrollments next_send_at
    const { data, error } = await supabase
      .from('followup_enrollments')
      .update({ next_send_at: parsedDate.toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('lead_id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
