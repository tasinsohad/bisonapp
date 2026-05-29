'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { Calendar, Video, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'
import { BisonSenderChip } from '@/components/shared/BisonSenderChip'

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  const { toast } = useToast()

  const fetchMeetings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(statusFilter ? { status: statusFilter } : {})
      })

      const res = await fetch(`/api/meetings?${params}`)
      const d = await res.json()
      
      if (d.data) {
        setMeetings(d.data)
        setTotalPages(d.meta?.totalPages || 1)
        setTotal(d.meta?.total || 0)
      } else if (d.error) {
        toast(d.error, 'error')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeetings()
  }, [statusFilter, page])

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Meetings</h1>
          <p className="text-slate-500">Scheduled appointments from your outreach.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="">All Statuses</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : meetings.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500">
              <Calendar className="w-12 h-12 mb-4 text-slate-300" />
              <p>No meetings found.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Lead</th>
                  <th className="px-6 py-3 font-medium">Event Type</th>
                  <th className="px-6 py-3 font-medium">Scheduled For</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meetings.map(meeting => (
                  <tr key={meeting.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/leads/${meeting.lead_id}`} className="block">
                        <div className="font-medium text-indigo-600 hover:underline">
                          {[meeting.leads?.first_name, meeting.leads?.last_name].filter(Boolean).join(' ') || meeting.leads?.email || 'Unknown'}
                        </div>
                        <div className="text-slate-500 text-xs mt-1 flex items-center">
                          <BisonSenderChip email={meeting.leads?.bison_sender_email_address} />
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {meeting.event_type_name || 'Meeting'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">{format(new Date(meeting.scheduled_at), 'MMM d, yyyy')}</div>
                      <div className="text-slate-500 text-xs">{format(new Date(meeting.scheduled_at), 'h:mm a')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        meeting.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        meeting.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {meeting.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {meeting.video_url ? (
                        <a href={meeting.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors text-xs font-medium">
                          <Video className="w-3.5 h-3.5 mr-1.5" /> Join
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">No link</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium">{meetings.length ? (page - 1) * 25 + 1 : 0}</span> to <span className="font-medium">{Math.min(page * 25, total)}</span> of <span className="font-medium">{total}</span> results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
