import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { runAppointmentSetter, runFollowupAgent } from '@/lib/ai'

export const maxDuration = 30 // Allow up to 30s for AI generation on Vercel

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { itemId, type } = await request.json()

    if (!itemId || !type) {
      return NextResponse.json({ error: 'Missing itemId or type' }, { status: 400 })
    }

    const admin = createAdminClient()

    if (type === 'ai_reply') {
      // Generate draft for a reply queue item
      const { data: queueItem } = await admin
        .from('reply_queue')
        .select('id, lead_id, status, draft_message')
        .eq('id', itemId)
        .single()

      if (!queueItem) {
        return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
      }

      // Update status to drafting
      await admin.from('reply_queue').update({ status: 'drafting' }).eq('id', itemId)

      // Run the appointment setter which will generate the draft and save it
      const success = await runAppointmentSetter(queueItem.lead_id, itemId)

      if (!success) {
        return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
      }

      // Fetch the updated item to return the draft
      const { data: updated } = await admin
        .from('reply_queue')
        .select('draft_message, status')
        .eq('id', itemId)
        .single()

      return NextResponse.json({ 
        success: true, 
        draft_message: updated?.draft_message,
        status: updated?.status
      })

    } else if (type === 'followup') {
      // Generate draft for a followup enrollment
      const { data: enrollment } = await admin
        .from('followup_enrollments')
        .select('*, leads(*), followup_sequences(*)')
        .eq('id', itemId)
        .single()

      if (!enrollment) {
        return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
      }

      const lead = enrollment.leads
      const steps = enrollment.followup_sequences?.steps as any[]
      const currentStepConfig = steps?.[enrollment.current_step - 1]

      const message = await runFollowupAgent(
        lead,
        enrollment.current_step,
        steps?.length || 1,
        currentStepConfig?.custom_message
      )

      if (message) {
        await admin.from('followup_enrollments')
          .update({ draft_message: message })
          .eq('id', itemId)

        return NextResponse.json({ 
          success: true, 
          draft_message: message 
        })
      } else {
        return NextResponse.json({ error: 'AI returned no message (may have marked as done)' }, { status: 500 })
      }

    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Generate draft error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
