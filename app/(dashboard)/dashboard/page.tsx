'use client'

import { useState, useEffect } from 'react'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { LeadPipeline } from '@/components/dashboard/LeadPipeline'
import { useToast } from '@/components/shared/Toast'
import { format } from 'date-fns'
import { X, AlertOctagon, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [showFailedModal, setShowFailedModal] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => {
        if (d.data) setStats(d.data)
        if (d.error) toast(d.error, 'error')
      })
      .catch(e => toast(e.message, 'error'))
  }, [toast])

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-500">Welcome back. Here's what's happening with your outreach.</p>
      </div>

      <StatsCards stats={stats} onFailedClick={() => setShowFailedModal(true)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <LeadPipeline />
        </div>
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Activity Feed</h2>
          <ActivityFeed />
        </div>
      </div>

      {showFailedModal && (
        <FailedOperationsModal onClose={() => setShowFailedModal(false)} />
      )}
    </div>
  )
}

function FailedOperationsModal({ onClose }: { onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchLogs = () => {
    setLoading(true)
    fetch('/api/dashboard/failed-operations')
      .then(r => r.json())
      .then(d => {
        if (d.data) setLogs(d.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all failed operation logs?')) return
    try {
      const res = await fetch('/api/dashboard/failed-operations', { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast('All failed logs cleared', 'success')
        fetchLogs()
      } else {
        toast(data.error || 'Failed to clear logs', 'error')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  const handleClearSpecific = async (id: string) => {
    try {
      const res = await fetch(`/api/dashboard/failed-operations?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast('Log cleared', 'success')
        fetchLogs()
      } else {
        toast(data.error || 'Failed to clear log', 'error')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slide-in-up">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-rose-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-rose-800 flex items-center">
            <AlertOctagon className="w-5 h-5 mr-2" /> 
            Failed Operations Logs
          </h2>
          <button onClick={onClose} className="p-2 text-rose-400 hover:text-rose-600 rounded-full hover:bg-rose-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-0 overflow-y-auto flex-1 bg-slate-50">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <AlertOctagon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No failed operations found.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-500 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                  <th className="px-6 py-3 font-medium">Lead</th>
                  <th className="px-6 py-3 font-medium">Sender Address</th>
                  <th className="px-6 py-3 font-medium">Error Message</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-rose-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4">
                      {log.leads ? (
                        <Link href={`/leads/${log.lead_id}`} className="block">
                          <div className="font-medium text-slate-900 group-hover:text-indigo-600">
                            {[log.leads.first_name, log.leads.last_name].filter(Boolean).join(' ') || log.leads.email}
                          </div>
                          <div className="text-slate-500 text-xs">{log.leads.email}</div>
                        </Link>
                      ) : (
                        <span className="text-slate-400">Unknown Lead ({log.lead_id})</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {log.bison_sender_email_address || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-rose-700 bg-rose-50 border border-rose-100 rounded-md p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {log.error_message || 'Unknown Error'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleClearSpecific(log.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50"
                        title="Clear log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 bg-white rounded-b-xl flex justify-between items-center">
          <div className="text-sm text-slate-500">
            Showing latest {logs.length} failed operations
          </div>
          <div className="flex gap-3">
            {logs.length > 0 && (
              <button onClick={handleClearAll} className="px-6 py-2 text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors">
                Clear All
              </button>
            )}
            <button onClick={onClose} className="px-6 py-2 text-slate-600 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
