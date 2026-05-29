import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendBisonEmail } from '@/lib/send-email'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { message } = await request.json()

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', params.id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const result = await sendBisonEmail({ lead, messageText: message })

  if (result.success) {
    // Append to conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, messages')
      .eq('lead_id', lead.id)
      .single()

    if (conv) {
      const messages = [...(conv.messages || []), {
        role: 'outbound',
        content: message,
        from_name: lead.bison_sender_email_name || '',
        from_email: lead.bison_sender_email_address || '',
        timestamp: new Date().toISOString(),
        source: 'manual',
      }]

      await supabase
        .from('conversations')
        .update({
          messages,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', conv.id)
    }

    // Activity feed
    await supabase.from('activity_feed').insert({
      lead_id: lead.id,
      lead_email: lead.email,
      lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
      event_type: 'email_sent',
      description: 'Manual email sent',
      metadata: { source: 'manual' },
    })
    
    // Update lead last_activity_at
    await supabase.from('leads').update({
      last_activity_at: new Date().toISOString(),
    }).eq('id', lead.id)

    return NextResponse.json({ success: true, data: result.data })
  } else {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
}
