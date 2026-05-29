'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BisonSenderChip } from '@/components/shared/BisonSenderChip'
import { formatDistanceToNow } from 'date-fns'
import { List, LayoutGrid } from 'lucide-react'

export function LeadPipeline() {
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchLeads()

    const channel = supabase.channel('leads-pipeline')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          fetchLeads()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('last_activity_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        setLeads(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { id: 'new', label: 'New', color: 'border-t-slate-500' },
    { id: 'engaged', label: 'Engaged', color: 'border-t-blue-500' },
    { id: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'border-t-emerald-500' },
    { id: 'ghosted', label: 'Ghosted', color: 'border-t-amber-500' },
    { id: 'done', label: 'Done', color: 'border-t-violet-500' },
    { id: 'unsubscribed', label: 'Unsubscribed', color: 'border-t-rose-500' },
  ]

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-extrabold text-slate-950">Pipeline Overview</h2>
        <div className="flex bg-slate-100/80 rounded-xl p-1 border border-slate-200/30">
          <button
            onClick={() => setView('kanban')}
            className={`p-1.5 rounded-lg flex items-center transition-all ${view === 'kanban' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('table')}
            className={`p-1.5 rounded-lg flex items-center transition-all ${view === 'table' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 px-1">
          {columns.map(col => (
            <div key={col.id} className="w-72 flex-shrink-0 flex flex-col bg-[#fcfdfe] rounded-[24px] p-4 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.006)]">
              <div className={`flex justify-between items-center mb-4 pt-2 px-1 border-t-2 ${col.color}`}>
                <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{col.label}</h3>
                <span className="text-[10px] font-extrabold bg-white text-slate-500 px-2 py-0.5 rounded-full border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                  {leads.filter(l => l.status === col.id).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '200px' }}>
                {leads.filter(l => l.status === col.id).map(lead => (
                  <Link key={lead.id} href={`/leads/${lead.id}`}>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.008)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.015)] hover:border-slate-200 transition-all duration-300 cursor-pointer group">
                      <div className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate mb-2">{lead.company || 'Direct Contact'}</div>
                      <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-50">
                        <BisonSenderChip email={lead.bison_sender_email_address} />
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          {lead.last_activity_at ? formatDistanceToNow(new Date(lead.last_activity_at)) : ''}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Lead</th>
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Sender</th>
                  <th className="px-6 py-3 font-medium">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.slice(0, 10).map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/leads/${lead.id}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email}
                      </div>
                      <div className="text-slate-500 text-xs">{lead.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{lead.company || '-'}</td>
                    <td className="px-6 py-4"><StatusBadge status={lead.status} /></td>
                    <td className="px-6 py-4"><BisonSenderChip email={lead.bison_sender_email_address} /></td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {lead.last_activity_at ? formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-center">
            <Link href="/leads" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all leads →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
