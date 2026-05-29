'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { useToast } from '@/components/shared/Toast'
import { Send, Bot, RefreshCw } from 'lucide-react'

export function ConversationThread({ lead, fetchLead }: { lead: any, fetchLead: any }) {
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const { toast } = useToast()

  const messages = lead.conversations?.[0]?.messages || []

  const handleSend = async () => {
    if (!replyText.trim()) return
    setSending(true)

    try {
      const res = await fetch(`/api/leads/${lead.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText })
      })
      const data = await res.json()
      
      if (res.ok) {
        toast('Email sent successfully', 'success')
        setReplyText('')
        fetchLead()
      } else {
        toast(data.error || 'Failed to send email', 'error')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setSending(false)
    }
  }

  const handleTriggerAgent = async () => {
    setTriggering(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/trigger-agent`, {
        method: 'POST'
      })
      const data = await res.json()
      
      if (res.ok) {
        toast('Agent triggered. It will run in the background.', 'success')
        setTimeout(fetchLead, 3000) // fetch after a short delay
      } else {
        toast(data.error || 'Failed to trigger agent', 'error')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="font-semibold text-slate-800">Email Thread</h2>
        <button 
          onClick={handleTriggerAgent}
          disabled={triggering}
          className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 flex items-center transition-colors disabled:opacity-50"
        >
          {triggering ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Bot className="w-4 h-4 mr-1.5" />}
          Trigger AI Agent
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 py-10">No messages in thread yet.</div>
        ) : (
          messages.map((msg: any, i: number) => {
            const isInbound = msg.role === 'inbound'
            return (
              <div key={i} className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  isInbound 
                    ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm' 
                    : 'bg-indigo-600 border border-indigo-700 text-white rounded-tr-sm'
                }`}>
                  <div className={`text-xs mb-2 pb-2 border-b font-medium flex justify-between items-center gap-4 ${
                    isInbound ? 'border-slate-100 text-slate-500' : 'border-indigo-500/50 text-indigo-200'
                  }`}>
                    <span>{msg.from_name || msg.from_email}</span>
                    <span>{format(new Date(msg.timestamp), 'MMM d, h:mm a')}</span>
                  </div>
                  
                  {msg.source === 'agent' && (
                    <div className="flex items-center text-[10px] mb-2 uppercase tracking-wider text-indigo-200 bg-indigo-800/50 px-2 py-0.5 rounded-full w-max">
                      <Bot className="w-3 h-3 mr-1" /> AI Generated
                    </div>
                  )}

                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isInbound ? 'text-slate-700' : 'text-indigo-50'}`}
                       dangerouslySetInnerHTML={{ __html: msg.html || msg.content.replace(/\n/g, '<br>') }} />
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200 rounded-b-xl">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type a manual reply here..."
          rows={3}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none mb-3"
        />
        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-500">
            Sending from: <span className="font-medium text-slate-700">{lead.bison_sender_email_address || 'Unknown'}</span>
          </div>
          <button 
            onClick={handleSend}
            disabled={sending || !replyText.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 flex items-center transition-colors disabled:opacity-50"
          >
            {sending ? 'Sending...' : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Reply
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
