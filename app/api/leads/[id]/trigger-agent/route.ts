import { NextRequest, NextResponse } from 'next/server'
import { runAppointmentSetter } from '@/lib/ai'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Run async, don't wait for it to finish for the HTTP response
    runAppointmentSetter(params.id).catch(console.error)
    
    return NextResponse.json({ success: true, message: 'Agent triggered' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
