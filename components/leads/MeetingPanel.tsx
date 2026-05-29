'use client'

import { format } from 'date-fns'
import { Calendar, Video, Clock, Link as LinkIcon } from 'lucide-react'

export function MeetingPanel({ lead }: { lead: any }) {
  const meetings = lead.meetings || []

  if (meetings.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <Calendar className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">No meetings yet</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          When this lead books a meeting via Cal.com, it will appear here automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting: any) => (
        <div key={meeting.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
              {meeting.event_type_name || 'Meeting'}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium border ${
              meeting.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              meeting.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
              'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {meeting.status}
            </span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-slate-800">
                      {format(new Date(meeting.scheduled_at), 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-sm text-slate-500">
                      {format(new Date(meeting.scheduled_at), 'h:mm a')} • {meeting.duration_minutes || 30} mins
                    </div>
                  </div>
                </div>
                
                {meeting.video_url && (
                  <div className="flex items-start">
                    <Video className="w-4 h-4 text-slate-400 mt-0.5 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-slate-800">Video Call Link</div>
                      <a href={meeting.video_url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline break-all">
                        {meeting.video_url}
                      </a>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4 md:border-l md:border-slate-100 md:pl-6">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Cal.com Booking UID</div>
                  <div className="text-sm font-mono bg-slate-50 px-2 py-1 rounded text-slate-700 inline-block">
                    {meeting.cal_booking_uid}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-500 mb-1">Booked At</div>
                  <div className="text-sm text-slate-700">
                    {format(new Date(meeting.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
