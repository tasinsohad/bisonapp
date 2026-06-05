import { NextRequest, NextResponse } from 'next/server'
import { runAppointmentSetter } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Starting debug for lead f06eee8a-7df7-439f-a4f1-b0ea168177e2')
    const success = await runAppointmentSetter('f06eee8a-7df7-439f-a4f1-b0ea168177e2')
    console.log('runAppointmentSetter returned:', success)
    
    // Also update the queue to test adminClient
    const supabase = createAdminClient()
    const { error } = await supabase.from('reply_queue').update({ status: success ? 'completed' : 'failed' }).eq('lead_id', 'f06eee8a-7df7-439f-a4f1-b0ea168177e2')
    
    if (error) console.error('Admin client update error:', error)
      
    return NextResponse.json({ success, updateError: error })
  } catch (err: any) {
    console.error('Debug caught error:', err)
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}
