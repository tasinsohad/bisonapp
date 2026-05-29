import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.text()
    
    // Check webhook signature if configured in settings
    const settings = await getSettings()
    const secret = settings.cal_webhook_secret
    
    if (secret) {
      const signature = request.headers.get('x-cal-signature-256')
      if (signature) {
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex')
          
        if (signature !== expectedSignature) {
          console.error('Cal.com webhook signature mismatch')
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
      }
    }

    const payload = JSON.parse(body)
    
    // We only care about BOOKING_CREATED events
    if (payload.triggerEvent === 'BOOKING_CREATED') {
      const attendees = payload.payload?.attendees || []
      
      for (const attendee of attendees) {
        if (!attendee.email) continue
        
        // Find lead by email
        const { data: lead } = await supabase
          .from('leads')
          .select('id, status, first_name, last_name')
          .eq('email', attendee.email)
          .single()
          
        if (lead) {
          // 1. Update lead status to meeting_scheduled
          await supabase
            .from('leads')
            .update({ 
              status: 'meeting_scheduled',
              updated_at: new Date().toISOString()
            })
            .eq('id', lead.id)

          // 2. Cancel any active follow-up sequences instantly
          await supabase
            .from('followup_enrollments')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('lead_id', lead.id)
            .eq('status', 'active')
            
          // 3. Log this huge win in the activity feed!
          await supabase.from('activity_feed').insert({
            lead_id: lead.id,
            lead_email: attendee.email,
            lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
            event_type: 'meeting_booked',
            description: `Lead booked a meeting! Follow-ups automatically cancelled.`,
            metadata: { source: 'cal_webhook', booking_uid: payload.payload?.uid }
          })
          
          console.log(`Successfully processed booking for lead: ${attendee.email}`)
        }
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Cal webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
