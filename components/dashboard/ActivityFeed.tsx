'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, UserPlus, Send, CalendarCheck, Clock, FileEdit, AlertCircle, Activity } from 'lucide-react'
import Link from 'next/link'

export function ActivityFeed() {
  const [activities, setActivities] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    fetch('/api/dashboard/activity')
      .then(r => r.json())
      .then(d => {
        if (d.data) setActivities(d.data)
      })
      .catch(console.error)

    // Setup realtime subscription
    const channel = supabase.channel('activity-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_feed' },
        (payload) => {
          setActivities((prev) => [payload.new, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const getIcon = (type: string) => {
    switch (type) {
      case 'lead_created': return <UserPlus className="w-4 h-4 text-emerald-500" />
      case 'reply_received': return <MessageSquare className="w-4 h-4 text-blue-500" />
      case 'email_sent': return <Send className="w-4 h-4 text-indigo-500" />
      case 'meeting_booked': return <CalendarCheck className="w-4 h-4 text-emerald-600" />
      case 'followup_sent': return <Send className="w-4 h-4 text-indigo-400" />
      case 'followup_enrolled': return <Clock className="w-4 h-4 text-amber-500" />
      case 'status_changed': return <FileEdit className="w-4 h-4 text-slate-500" />
      case 'agent_decision': return <AlertCircle className="w-4 h-4 text-purple-500" />
      default: return <Activity className="w-4 h-4 text-slate-400" />
    }
  }

  return (
    <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.012)] overflow-hidden h-[400px] flex flex-col hover:shadow-[0_12px_40px_rgba(0,0,0,0.025)] transition-all duration-300">
      <div className="px-6 py-4 border-b border-slate-50 bg-[#fafbfc]">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Live Activity</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {activities.length === 0 ? (
          <div className="text-center text-xs font-bold text-slate-400 py-10 uppercase tracking-wider">No recent activity</div>
        ) : (
          activities.map((activity) => (
            <Link href={`/leads/${activity.lead_id}`} key={activity.id} className="block hover:bg-slate-50 p-2 -mx-2 rounded-xl transition-colors cursor-pointer group">
              <div className="flex gap-4 animate-slide-in-right">
                <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-white group-hover:bg-indigo-50 flex items-center justify-center border border-slate-100/50 shadow-sm transition-colors">
                  {getIcon(activity.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {activity.lead_name || activity.lead_email || 'Unknown Lead'}
                  </p>
                  <p className="text-xs font-medium text-slate-500 truncate">{activity.description}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
