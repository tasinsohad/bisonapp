import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const searchParams = request.nextUrl.searchParams
  
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 25
  const status = searchParams.get('status')

  let query = supabase
    .from('meetings')
    .select(`
      *,
      leads (
        first_name,
        last_name,
        email,
        bison_sender_email_address,
        bison_campaign_name
      )
    `, { count: 'exact' })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, count, error } = await query
    .order('scheduled_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    meta: {
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  })
}
