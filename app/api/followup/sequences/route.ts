import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  // Get sequences with enrollment count
  const { data: sequences, error } = await supabase
    .from('followup_sequences')
    .select(`
      *,
      followup_enrollments(count)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Format the count properly
  const formattedData = sequences.map(seq => ({
    ...seq,
    enrollments_count: seq.followup_enrollments[0]?.count || 0
  }))

  return NextResponse.json({ data: formattedData })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (!body.name || !body.steps || !Array.isArray(body.steps)) {
    return NextResponse.json({ error: 'Name and steps array are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('followup_sequences')
    .insert({
      name: body.name,
      steps: body.steps,
      is_active: body.is_active !== false
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
