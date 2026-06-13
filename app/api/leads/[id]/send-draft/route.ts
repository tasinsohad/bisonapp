import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { executeDraftedQueueItem } from '@/lib/ai'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { queueId } = await request.json()
    if (!queueId) {
      return NextResponse.json({ error: 'Queue ID is required' }, { status: 400 })
    }

    const { data: queueItem } = await supabase
      .from('reply_queue')
      .select('status, lead_id')
      .eq('id', queueId)
      .eq('lead_id', params.id)
      .single()

    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
    }

    // Process the draft
    await supabase.from('reply_queue').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', queueId)
    
    const success = await executeDraftedQueueItem(queueId)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Failed to execute drafted queue item. Check system logs.' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Failed to send draft:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
