'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { Bot, Terminal, CheckCircle2, XCircle } from 'lucide-react'

export function AgentDebug({ lead }: { lead: any }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('agent_logs')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setLogs(data)
        setLoading(false)
      })
  }, [lead.id, supabase])

  if (loading) {
    return <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block"></div></div>
  }

  return (
    <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden text-slate-300">
      <div className="px-6 py-4 border-b border-slate-800 bg-black/40 flex items-center justify-between">
        <h3 className="font-semibold text-slate-100 flex items-center">
          <Terminal className="w-4 h-4 mr-2 text-emerald-400" />
          Agent Execution Logs
        </h3>
        <span className="text-xs font-mono text-slate-500">Total runs: {logs.length}</span>
      </div>
      
      <div className="p-0">
        {logs.length === 0 ? (
          <div className="text-center text-slate-500 py-10 font-mono text-sm">
            No agent execution logs found.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {logs.map((log) => (
              <div key={log.id} className="p-6 font-mono text-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {log.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    )}
                    <div>
                      <div className="text-slate-200 font-bold">{log.agent_type.toUpperCase()} RUN</div>
                      <div className="text-xs text-slate-500">{format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss.SSS')}</div>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                    ID: {log.id.split('-')[0]}
                  </div>
                </div>

                <div className="space-y-4 ml-8">
                  <div className="flex">
                    <span className="w-24 text-slate-500 shrink-0">Action:</span>
                    <span className={log.action_decided === 'error' ? 'text-rose-400' : 'text-emerald-400 font-bold'}>
                      {log.action_decided || 'none'}
                    </span>
                  </div>
                  
                  {log.prompt_used && (
                    <div>
                      <span className="block text-slate-500 mb-2">Prompt Sent:</span>
                      <div className="bg-black/50 p-3 rounded text-slate-400 text-xs overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                        {log.prompt_used}
                      </div>
                    </div>
                  )}

                  {log.response_message && (
                    <div>
                      <span className="block text-slate-500 mb-2">Generated Output:</span>
                      <div className="bg-indigo-900/20 border border-indigo-900/50 p-3 rounded text-indigo-200 text-xs overflow-x-auto whitespace-pre-wrap">
                        {log.response_message}
                      </div>
                    </div>
                  )}

                  {log.error_message && (
                    <div>
                      <span className="block text-slate-500 mb-2">Error Trace:</span>
                      <div className="bg-rose-900/20 border border-rose-900/50 p-3 rounded text-rose-300 text-xs overflow-x-auto whitespace-pre-wrap">
                        {log.error_message}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
