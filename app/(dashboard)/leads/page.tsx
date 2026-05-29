'use client'

import { useState, useEffect } from 'react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BisonSenderChip } from '@/components/shared/BisonSenderChip'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Search, Filter, Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  const { toast } = useToast()

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {})
      })

      const res = await fetch(`/api/leads?${params}`)
      const d = await res.json()
      
      if (d.data) {
        setLeads(d.data)
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
    const delayDebounceFn = setTimeout(() => {
      fetchLeads()
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [search, statusFilter, page])

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Leads</h1>
          <p className="text-slate-500">Manage your outreach pipeline.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 flex items-center transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button className="px-4 py-2 bg-indigo-600 border border-transparent text-white rounded-lg shadow-sm hover:bg-indigo-700 flex items-center transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="engaged">Engaged</option>
                <option value="meeting_scheduled">Meeting Scheduled</option>
                <option value="ghosted">Ghosted</option>
                <option value="done">Done</option>
                <option value="unsubscribed">Unsubscribed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : leads.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500">
              <Users className="w-12 h-12 mb-4 text-slate-300" />
              <p>No leads found.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Lead</th>
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium hidden md:table-cell">Sender</th>
                  <th className="px-6 py-3 font-medium hidden lg:table-cell">Campaign</th>
                  <th className="px-6 py-3 font-medium">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <Link href={`/leads/${lead.id}`} className="block">
                        <div className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email}
                        </div>
                        <div className="text-slate-500 text-xs">{lead.email}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <Link href={`/leads/${lead.id}`} className="block">{lead.company || '-'}</Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/leads/${lead.id}`} className="block"><StatusBadge status={lead.status} /></Link>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <Link href={`/leads/${lead.id}`} className="block"><BisonSenderChip email={lead.bison_sender_email_address} /></Link>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-slate-500 text-xs truncate max-w-[150px]">
                      <Link href={`/leads/${lead.id}`} className="block" title={lead.bison_campaign_name || ''}>
                        {lead.bison_campaign_name || '-'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      <Link href={`/leads/${lead.id}`} className="block">
                        {lead.last_activity_at ? formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true }) : '-'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium">{leads.length ? (page - 1) * 25 + 1 : 0}</span> to <span className="font-medium">{Math.min(page * 25, total)}</span> of <span className="font-medium">{total}</span> results
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
import { Users } from 'lucide-react'
