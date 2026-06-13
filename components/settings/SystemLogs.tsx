'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, RefreshCw, XCircle, Bot, Webhook } from 'lucide-react'
import Link from 'next/link'

export function SystemLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/logs')
      const d = await res.json()
      if (d.data) {
        setLogs(d.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">System Error Logs</h2>
          <p className="text-sm text-slate-500 mt-1">Review recent failures from AI agents and Webhooks.</p>
        </div>
        <button 
          onClick={fetchLogs} 
          disabled={loading}
          className="p-2 bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
              <XCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-slate-900 font-medium mb-1">No errors found</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Your system is running smoothly. Any future AI generation failures or webhook crashes will be logged here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3 border-b border-slate-200">Timestamp</th>
                  <th className="px-6 py-3 border-b border-slate-200">Source</th>
                  <th className="px-6 py-3 border-b border-slate-200 w-full">Error Message</th>
                  <th className="px-6 py-3 border-b border-slate-200 text-right">Related Lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-600">
                      {format(new Date(log.created_at), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {log.source.includes('AI') ? (
                          <Bot className="w-4 h-4 text-indigo-500" />
                        ) : (
                          <Webhook className="w-4 h-4 text-emerald-500" />
                        )}
                        <span className="font-medium text-slate-700">{log.source}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-red-600 whitespace-normal min-w-[300px]">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{log.error_message}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {log.lead_id ? (
                        <Link href={`/leads/${log.lead_id}`} className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium">
                          View Lead
                        </Link>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
