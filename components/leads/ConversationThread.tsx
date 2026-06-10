'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { useToast } from '@/components/shared/Toast'
import { Send, Bot, RefreshCw, Clock, Calendar } from 'lucide-react'

export function ConversationThread({ lead, fetchLead }: { lead: any, fetchLead: any }) {
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [reschedulingItem, setReschedulingItem] = useState<{id: string, type: string, date: string} | null>(null)
  const [rescheduling, setRescheduling] = useState(false)
  const [editingDraft, setEditingDraft] = useState<{id: string, type: string, text: string} | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const { toast } = useToast()

  const messages = lead.conversations?.[0]?.messages || []

  // Pending AI Replies
  const pendingReplies = (lead.reply_queue || [])
    .filter((q: any) => ['pending', 'processing', 'failed'].includes(q.status))
    .map((q: any) => ({
      isPending: true,
      id: q.id,
      type: 'ai_reply',
      timestamp: q.send_after,
      content: q.draft_message || (q.status === 'drafting' ? 'AI is drafting a reply...' : 'AI will send a generated reply...'),
      status: q.status
    }))

  // Pending Followup
  const activeEnrollment = (lead.followup_enrollments || []).find((e: any) => e.status === 'active')
  const pendingFollowups = activeEnrollment && activeEnrollment.next_send_at ? [{
    isPending: true,
    id: activeEnrollment.id,
    type: 'followup',
    timestamp: activeEnrollment.next_send_at,
    content: activeEnrollment.draft_message || `Scheduled Follow-up (Step ${activeEnrollment.current_step}) from "${activeEnrollment.followup_sequences?.name || 'Sequence'}". Generating draft...`,
    status: 'pending'
  }] : []

  // Combine and sort
  const allThreadItems = [...messages.map((m: any) => ({...m, isPending: false, status: 'sent'})), ...pendingReplies, ...pendingFollowups]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

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

  const handleReschedule = async () => {
    if (!reschedulingItem) return
    setRescheduling(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reschedulingItem.id,
          type: reschedulingItem.type,
          newDate: new Date(reschedulingItem.date).toISOString()
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast('Rescheduled successfully', 'success')
        setReschedulingItem(null)
        fetchLead()
      } else {
        toast(data.error || 'Failed to reschedule', 'error')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setRescheduling(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!editingDraft) return
    setSavingDraft(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/edit-draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDraft.id,
          type: editingDraft.type,
          newDraftMessage: editingDraft.text
        })
      })
      if (res.ok) {
        toast('Draft saved successfully', 'success')
        setEditingDraft(null)
        fetchLead()
      } else {
        const data = await res.json()
        toast(data.error || 'Failed to save draft', 'error')
      }
    } catch(e: any) {
      toast(e.message, 'error')
    } finally {
      setSavingDraft(false)
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
        {allThreadItems.length === 0 ? (
          <div className="text-center text-slate-400 py-10">No messages in thread yet.</div>
        ) : (
          allThreadItems.map((msg: any, i: number) => {
            if (msg.isPending) {
              return (
                <div key={`pending-${i}`} className="flex flex-col items-end">
                  <div className="max-w-[85%] rounded-2xl p-4 shadow-sm bg-indigo-50 border border-indigo-200 border-dashed text-slate-800 rounded-tr-sm opacity-80">
                    <div className="text-xs mb-2 pb-2 border-b font-medium flex justify-between items-center gap-4 border-indigo-100 text-indigo-500">
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> Scheduled</span>
                      
                      <div className="flex items-center gap-2">
                        {reschedulingItem?.id === msg.id && reschedulingItem?.type === msg.type ? (
                          <div className="flex items-center gap-1.5 bg-white rounded p-1 shadow-sm border border-indigo-100">
                            <input 
                              type="datetime-local" 
                              value={reschedulingItem?.date || ''}
                              onChange={e => setReschedulingItem(prev => prev ? { ...prev, date: e.target.value } : null)}
                              className="text-xs border-none focus:ring-0 p-0 text-slate-700 bg-transparent h-5"
                            />
                            <button 
                              onClick={handleReschedule} 
                              disabled={rescheduling}
                              className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setReschedulingItem(null)} 
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] hover:bg-slate-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span>{format(new Date(msg.timestamp), 'MMM d, h:mm a')}</span>
                            <button 
                              onClick={() => {
                                // Extract YYYY-MM-DDThh:mm string format for the datetime-local input using local time
                                const d = new Date(msg.timestamp)
                                const tzOffset = d.getTimezoneOffset() * 60000
                                const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
                                setReschedulingItem({ id: msg.id, type: msg.type, date: localISOTime })
                              }}
                              className="p-1 hover:bg-indigo-100 rounded text-indigo-400 hover:text-indigo-600 transition-colors"
                              title="Reschedule"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-[10px] mb-2 uppercase tracking-wider text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full w-max mt-2">
                      <Bot className="w-3 h-3 mr-1" /> {msg.type === 'ai_reply' ? 'AI Reply Queue' : 'Automated Sequence'}
                      <span className="ml-2 border-l border-indigo-200 pl-2">
                        Status: <span className={`font-semibold ${msg.status === 'failed' ? 'text-rose-600' : ''}`}>{msg.status}</span>
                      </span>
                    </div>
                    {editingDraft?.id === msg.id && editingDraft?.type === msg.type ? (
                      <div className="mt-2 w-full text-left">
                        <textarea 
                          value={editingDraft?.text || ''}
                          onChange={e => setEditingDraft(prev => prev ? {...prev, text: e.target.value} : null)}
                          rows={6}
                          className="w-full text-sm p-3 border border-indigo-200 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white shadow-inner"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => setEditingDraft(null)} className="px-3 py-1.5 text-xs bg-slate-100 rounded-md text-slate-600 hover:bg-slate-200 transition-colors font-medium">Cancel</button>
                          <button onClick={handleSaveDraft} disabled={savingDraft} className="px-3 py-1.5 text-xs bg-indigo-600 rounded-md text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
                            {savingDraft ? 'Saving...' : 'Save Draft'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed text-indigo-900 mt-2 relative group w-full text-left bg-white/50 rounded-lg p-3 border border-indigo-100">
                        {msg.content}
                        <button 
                          onClick={() => setEditingDraft({id: msg.id, type: msg.type, text: msg.content})}
                          className="absolute -top-2.5 -right-2.5 bg-white text-indigo-600 border border-indigo-200 rounded-md px-2.5 py-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-indigo-50 font-medium"
                        >
                          Edit Draft
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            }

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
                    <div className={`flex items-center text-[10px] mb-2 uppercase tracking-wider px-2 py-0.5 rounded-full w-max ${
                      isInbound ? 'text-indigo-600 bg-indigo-100/50' : 'text-indigo-200 bg-indigo-800/50'
                    }`}>
                      <Bot className="w-3 h-3 mr-1" /> AI Generated
                      <span className={`ml-2 border-l pl-2 ${isInbound ? 'border-indigo-200' : 'border-indigo-700'}`}>Status: SENT</span>
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
