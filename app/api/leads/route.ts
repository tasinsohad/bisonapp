import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 25
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const campaign = searchParams.get('campaign_id')

  let query = supabase
    .from('leads')
    .select(`
      *,
      followup_enrollments!left(
        id,
        status,
        current_step,
        next_send_at,
        sequence_id,
        followup_sequences(name)
      )
    `, { count: 'exact' })

  if (status) {
    query = query.eq('status', status)
  }
  
  if (campaign) {
    query = query.eq('bison_campaign_id', campaign)
  }

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
  }

  const { data, count, error } = await query
    .order('last_activity_at', { ascending: false })
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

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (!body.email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Insert lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
      title: body.title,
      company: body.company,
      website: body.website,
      status: body.status || 'new',
      bison_sender_email_id: body.bison_sender_email_id || null, // Optional for manual leads
    })
    .select()
    .single()

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 })
  }

  // Create empty conversation
  await supabase
    .from('conversations')
    .insert({
      lead_id: lead.id,
      messages: []
    })

  // Activity feed
  await supabase.from('activity_feed').insert({
    lead_id: lead.id,
    lead_email: lead.email,
    lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
    event_type: 'lead_created',
    description: 'Lead added manually',
  })

  return NextResponse.json({ data: lead }, { status: 201 })
}
