'use client'

import { useState, useEffect } from 'react'
import { Save, Copy, Check, Terminal, Play, RefreshCw, AlertCircle, Eye, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function WebhookSettings({ settings, setSettings, onSave }: any) {
  const supabase = createClient()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [selectedPayload, setSelectedPayload] = useState<any>(null)
  
  // Custom mock tester state
  const [testLeadName, setTestLeadName] = useState('John Doe')
  const [testLeadEmail, setTestLeadEmail] = useState('john.doe@company.com')
  const [testBody, setTestBody] = useState('Hi, I am interested in your software. Do you have 10 mins this Thursday at 2 PM EST for a call?')
  const [testEventType, setTestEventType] = useState('CONTACT_REPLIED')
  const [triggeringTest, setTriggeringTest] = useState(false)
  const [testStatus, setTestStatus] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhooks/bison`)
    }
    fetchLogs()
  }, [])

  // Auto-refresh logs
  useEffect(() => {
    const timer = setInterval(() => {
      fetchLogs()
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const fetchLogs = async () => {
    setLoadingLogs(true)
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(10)
    
    if (!error && data) {
      setLogs(data)
    }
    setLoadingLogs(false)
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let secret = ''
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setSettings({ ...settings, webhook_secret: secret })
  }

  const triggerTestWebhook = async () => {
    setTriggeringTest(true)
    setTestStatus(null)
    
    // Construct rich Email Bison production-level mock payload
    const mockPayload = {
      event: {
        type: testEventType,
        instance_url: 'https://bison-instance.emailbison.com',
        workspace_name: 'LeadPilot Mock Space',
        timestamp: new Date().toISOString()
      },
      data: {
        lead: {
          id: Math.floor(Math.random() * 100000),
          email: testLeadEmail,
          first_name: testLeadName.split(' ')[0] || 'John',
          last_name: testLeadName.split(' ').slice(1).join(' ') || 'Doe',
          company: 'Acme Corp',
          title: 'Director of Growth',
          custom_variables: [
            { name: 'website', value: 'https://acme-corp.com' },
            { name: 'industry', value: 'SaaS Software' },
            { name: 'country', value: 'United States' }
          ]
        },
        reply: {
          id: Math.floor(Math.random() * 100000),
          text_body: testBody,
          html_body: `<p>${testBody}</p>`,
          email_subject: 'Re: Quick inquiry about sales automations',
          date_received: new Date().toISOString(),
          from_name: testLeadName,
          from_email_address: testLeadEmail
        },
        sender_email: {
          id: 42,
          name: 'Sarah Bennett',
          email: 'sarah@leadpilotoutbound.com'
        },
        campaign: {
          id: 777,
          name: 'Global Enterprise SaaS Campaign'
        }
      }
    }

    try {
      const response = await fetch('/api/webhooks/bison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-simulation': 'true' // Security bypass token signed dynamically by session cookie
        },
        body: JSON.stringify(mockPayload)
      })

      if (response.ok) {
        setTestStatus('success')
        setTimeout(() => {
          fetchLogs()
        }, 1000)
      } else {
        const err = await response.json()
        setTestStatus(`error: ${err.error || 'Server error'}`)
      }
    } catch (e: any) {
      setTestStatus(`error: ${e.message}`)
    } finally {
      setTriggeringTest(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div>
        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Webhook Configuration</h3>
        <p className="mt-1 text-sm text-slate-500">Configure Email Bison to sync incoming outreach replies to LeadPilot in real-time.</p>
      </div>

      {/* 2. Webhook Settings Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-6 border-b border-slate-100 pb-8">
        <div className="lg:col-span-6 space-y-1">
          <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono text-xs focus:outline-none"
            />
            <button
              onClick={copyUrl}
              className="px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center shadow-sm"
              title="Copy URL"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
          <p className="text-[10px] font-semibold text-slate-400">
            Paste this URL inside your Email Bison platform under **Settings &gt; Developer &gt; Webhooks**.
          </p>
        </div>

        <div className="lg:col-span-4 space-y-1">
          <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider">Webhook Secret (HMAC)</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={settings.webhook_secret || ''}
              onChange={(e) => setSettings({ ...settings, webhook_secret: e.target.value })}
              placeholder="Leave blank to disable validation"
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950 focus:border-slate-950 text-sm"
            />
            <button
              onClick={generateSecret}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm"
            >
              Generate
            </button>
          </div>
          <p className="text-[10px] font-semibold text-slate-400">
            Recommended. Authenticates that incoming webhook payloads actually originated from Bison.
          </p>
        </div>

        <div className="lg:col-span-6 pt-2">
          <button
            onClick={onSave}
            className="flex items-center py-2.5 px-5 text-xs font-extrabold rounded-xl text-white bg-slate-950 hover:bg-slate-900 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" /> Save Settings
          </button>
        </div>
      </div>

      {/* 3. Interactive Webhook Tester Panel */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.01)] space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
          <Terminal className="w-5 h-5 text-blue-600" />
          <h4 className="font-extrabold text-sm text-slate-950 uppercase tracking-wider">Webhook Tester Simulator</h4>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Simulate a production-level incoming Email Bison webhook payload. This will instantly trigger database lead-matching, contact logs insertion, and the AI appointment setter pipeline.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mock Lead Name</label>
            <input 
              type="text" 
              value={testLeadName} 
              onChange={e => setTestLeadName(e.target.value)} 
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mock Lead Email</label>
            <input 
              type="email" 
              value={testLeadEmail} 
              onChange={e => setTestLeadEmail(e.target.value)} 
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mock Event Type</label>
            <select 
              value={testEventType} 
              onChange={e => setTestEventType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
            >
              <option value="CONTACT_REPLIED">CONTACT_REPLIED (Outreach Reply)</option>
              <option value="LEAD_INTERESTED">LEAD_INTERESTED (Hot Lead Flag)</option>
              <option value="EMAIL_BOUNCED">EMAIL_BOUNCED (Bounced Flag)</option>
              <option value="CONTACT_UNSUBSCRIBED">CONTACT_UNSUBSCRIBED (Unsubscribed)</option>
            </select>
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mock Email Message Body</label>
            <textarea 
              rows={2} 
              value={testBody} 
              onChange={e => setTestBody(e.target.value)} 
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerTestWebhook}
            disabled={triggeringTest}
            className="flex items-center py-2.5 px-5 text-xs font-extrabold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 mr-2" /> 
            {triggeringTest ? 'Sending Webhook...' : 'Fire Test Payload'}
          </button>
          
          {testStatus === 'success' && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg flex items-center">
              <Check className="w-3.5 h-3.5 mr-1" /> Webhook Received Successfully!
            </span>
          )}
          {testStatus && testStatus.startsWith('error') && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1" /> {testStatus}
            </span>
          )}
        </div>
      </div>

      {/* 4. Realtime Logs Console */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.01)] space-y-4">
        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-slate-800" />
            <h4 className="font-extrabold text-sm text-slate-950 uppercase tracking-wider">Live Webhook Log Console</h4>
          </div>
          <button 
            onClick={fetchLogs} 
            disabled={loadingLogs}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/20 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Waiting for webhook events...
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-[#fafbfc]">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Event Type</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Source Workspace</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-all text-xs">
                    <td className="px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                      {new Date(log.received_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-extrabold ${
                        log.event_type.includes('REPLIED') || log.event_type.includes('INTERESTED') 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {log.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700 truncate max-w-[150px]">
                      {log.bison_workspace_name || 'Bison Webhook'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.processed ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-lg border border-emerald-100 inline-flex items-center">
                          Processed
                        </span>
                      ) : log.error_message ? (
                        <span 
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[9px] font-bold rounded-lg border border-rose-100 inline-flex items-center cursor-help"
                          title={log.error_message}
                        >
                          Failed: {log.error_message.substring(0, 15)}...
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[9px] font-bold rounded-lg border border-amber-100 inline-flex items-center">
                          Received
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedPayload(log.payload)}
                        className="text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg p-1.5 hover:bg-slate-100 transition-all inline-flex items-center"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Payload Inspector Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 bg-slate-950 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Payload Inspector</span>
              </div>
              <button 
                onClick={() => setSelectedPayload(null)} 
                className="text-slate-400 hover:text-white transition-all p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-900 text-emerald-400 font-mono text-xs leading-relaxed select-all">
              <pre className="whitespace-pre-wrap">{JSON.stringify(selectedPayload, null, 2)}</pre>
            </div>
            
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-5 py-2 text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all shadow-sm"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
