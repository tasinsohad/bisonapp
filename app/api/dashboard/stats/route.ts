import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()

  const [
    { count: totalLeads },
    { count: meetingsThisMonth },
    { count: activeEnrollments },
    { count: repliesToday },
    { count: failedOperations }
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    
    supabase.from('meetings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      
    supabase.from('followup_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
      
    supabase.from('activity_feed')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'reply_received')
      .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
      
    supabase.from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
  ])

  return NextResponse.json({
    data: {
      total_leads: totalLeads || 0,
      meetings_this_month: meetingsThisMonth || 0,
      active_enrollments: activeEnrollments || 0,
      replies_today: repliesToday || 0,
      failed_operations: failedOperations || 0
    }
  })
}
