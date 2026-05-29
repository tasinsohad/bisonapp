'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow, format } from 'date-fns'
import { MessageSquare, UserPlus, Send, CalendarCheck, Clock, FileEdit, AlertCircle } from 'lucide-react'

export function ActivityLog({ lead }: { lead: any }) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('activity_feed')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setActivities(data)
        setLoading(false)
      })
  }, [lead.id, supabase])

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
      default: return <div className="w-2 h-2 rounded-full bg-slate-300" />
    }
  }

  if (loading) {
    return <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block"></div></div>
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-slate-800">Timeline</h3>
      </div>
      <div className="p-6">
        {activities.length === 0 ? (
          <div className="text-center text-slate-500 py-4">No activities logged yet.</div>
        ) : (
          <div className="relative border-l border-slate-200 ml-3 space-y-8">
            {activities.map((activity) => (
              <div key={activity.id} className="relative pl-8 animate-fade-in">
                <div className="absolute -left-[17px] w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  {getIcon(activity.event_type)}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900 capitalize">
                    {activity.event_type.replace(/_/g, ' ')}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{activity.description}</p>
                  
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="mt-2 text-xs font-mono bg-slate-50 p-2 rounded text-slate-500 overflow-x-auto">
                      {JSON.stringify(activity.metadata)}
                    </div>
                  )}
                  
                  <div className="text-xs text-slate-400 mt-2" title={format(new Date(activity.created_at), 'PPpp')}>
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
