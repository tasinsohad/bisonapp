import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  // Fetch failed operations from email_logs
  const { data: failedLogs, error } = await supabase
    .from('email_logs')
    .select(`
      id,
      created_at,
      error_message,
      lead_id,
      bison_sender_email_address,
      leads (
        email,
        first_name,
        last_name
      )
    `)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: failedLogs })
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  let query = supabase.from('email_logs').delete().eq('status', 'failed')

  if (id) {
    query = query.eq('id', id)
  }

  const { error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
