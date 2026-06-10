import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { runAppointmentSetter } from '@/lib/ai'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Create a drafting queue item to hold the draft
    const { data: queue } = await supabase.from('reply_queue').insert({
      lead_id: params.id,
      status: 'drafting',
      send_after: new Date().toISOString()
    }).select('id').single()

    // Wait for the agent to draft it synchronously (takes ~5s)
    if (queue) {
      await runAppointmentSetter(params.id, queue.id)
    }
    return NextResponse.json({ success: true, message: 'Agent triggered' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
