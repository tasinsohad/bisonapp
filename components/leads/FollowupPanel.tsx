'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { useToast } from '@/components/shared/Toast'
import { Play, Pause, XCircle, Plus, Clock, Timer, Bot, RefreshCw, Edit2 } from 'lucide-react'

/**
 * Live countdown hook
 */
function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft('')
      return
    }

    const update = () => {
      const now = Date.now()
      const target = new Date(targetDate).getTime()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft('due')
        return
      }

      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)

      if (hours > 24) {
        const days = Math.floor(hours / 24)
        setTimeLeft(`${days}d ${hours % 24}h`)
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${seconds}s`)
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

export function FollowupPanel({ lead, fetchLead }: { lead: any, fetchLead: any }) {
  const [sequences, setSequences] = useState<any[]>([])
  const [selectedSequence, setSelectedSequence] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [updating, setUpdating] = useState(false)
  
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('followup_sequences').select('id, name, steps').eq('is_active', true)
      .then(({ data }) => { if (data) setSequences(data) })
  }, [supabase])

  const enrollments = lead.followup_enrollments || []
  const activeEnrollment = enrollments.find((e: any) => e.status === 'active' || e.status === 'paused')
  const countdown = useCountdown(activeEnrollment?.next_send_at || null)

  const handleEnroll = async () => {
    if (!selectedSequence) return
    setEnrolling(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence_id: selectedSequence })
      })
      const data = await res.json()
      if (res.ok) {
        toast('Enrolled in sequence', 'success')
        fetchLead()
      } else {
        toast(data.error, 'error')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setEnrolling(false)
    }
  }

  const handleUpdate = async (action: 'pause' | 'resume' | 'cancel') => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/enrollment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const data = await res.json()
      if (res.ok) {
        toast(`Enrollment ${action}d`, 'success')
        fetchLead()
      } else {
        toast(data.error, 'error')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {!activeEnrollment ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Clock className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Not currently enrolled</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
              This lead is not actively enrolled in any follow-up sequence. Select a sequence below to start automated follow-ups.
            </p>
            
            <div className="flex max-w-sm mx-auto items-center gap-2">
              <select
                value={selectedSequence}
                onChange={e => setSelectedSequence(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a sequence...</option>
                {sequences.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.steps.length} steps)</option>
                ))}
              </select>
              <button
                onClick={handleEnroll}
                disabled={enrolling || !selectedSequence}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" /> Enroll
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-semibold text-slate-800 flex items-center">
                Active Sequence
                <span className={`ml-3 px-2 py-0.5 rounded text-xs font-medium ${
                  activeEnrollment.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {activeEnrollment.status.toUpperCase()}
                </span>
              </h3>
              <p className="text-sm text-slate-500 mt-1">{activeEnrollment.followup_sequences.name}</p>
            </div>
            
            <div className="flex gap-2">
              {activeEnrollment.status === 'active' ? (
                <button
                  onClick={() => handleUpdate('pause')}
                  disabled={updating}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md text-sm flex items-center transition-colors disabled:opacity-50 border border-amber-200"
                >
                  <Pause className="w-4 h-4 mr-1.5" /> Pause
                </button>
              ) : (
                <button
                  onClick={() => handleUpdate('resume')}
                  disabled={updating}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md text-sm flex items-center transition-colors disabled:opacity-50 border border-emerald-200"
                >
                  <Play className="w-4 h-4 mr-1.5" /> Resume
                </button>
              )}
              <button
                onClick={() => handleUpdate('cancel')}
                disabled={updating}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md text-sm flex items-center transition-colors disabled:opacity-50 border border-rose-200"
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Cancel
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 max-w-lg mb-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Current Step</div>
                <div className="text-2xl font-bold text-slate-800">
                  {activeEnrollment.current_step} <span className="text-lg text-slate-400 font-normal">/ {activeEnrollment.followup_sequences.steps.length}</span>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col justify-center">
                <div className="text-xs text-slate-500 mb-1">Next Send Time</div>
                <div className="text-sm font-medium text-slate-800 mb-1">
                  {activeEnrollment.next_send_at ? format(new Date(activeEnrollment.next_send_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                </div>
                {activeEnrollment.status === 'active' && activeEnrollment.next_send_at && (
                  <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full text-xs font-medium tabular-nums w-max mt-1">
                    <Timer className="w-3 h-3" />
                    {countdown === 'due' ? 'Sending shortly...' : `Sending in ${countdown}`}
                  </div>
                )}
              </div>
            </div>

            {/* AI Draft Preview Section */}
            <div className="mb-8 relative bg-indigo-50/50 rounded-xl border border-indigo-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-indigo-100">
                <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600">
                  <Bot className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-indigo-900 text-sm">Next Scheduled Message</h4>
                {activeEnrollment.status === 'active' && (
                  <span className="ml-auto text-xs font-medium text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Step {activeEnrollment.current_step}
                  </span>
                )}
              </div>
              
              {activeEnrollment.draft_message ? (
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-lg border border-indigo-100 shadow-sm relative group">
                  {activeEnrollment.draft_message}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <RefreshCw className="w-6 h-6 text-indigo-300 animate-spin mb-3" />
                  <p className="text-sm font-medium text-indigo-900">AI is drafting the next message...</p>
                  <p className="text-xs text-indigo-500 mt-1 max-w-sm">
                    The AI is currently analyzing the lead's website and history to write the perfect follow-up. This usually takes a few seconds.
                  </p>
                </div>
              )}
            </div>

            <div className="relative border-l-2 border-indigo-100 ml-4 pl-6 space-y-6">
              {activeEnrollment.followup_sequences.steps.map((step: any, index: number) => {
                const stepNum = index + 1;
                const isPast = stepNum < activeEnrollment.current_step;
                const isCurrent = stepNum === activeEnrollment.current_step;
                
                return (
                  <div key={index} className="relative">
                    <div className={`absolute -left-[35px] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      isPast ? 'bg-indigo-600 border-indigo-600 text-white' : 
                      isCurrent ? 'bg-white border-indigo-600 text-indigo-600' : 'bg-white border-slate-300 text-slate-400'
                    }`}>
                      {stepNum}
                    </div>
                    <div>
                      <h4 className={`text-sm font-semibold ${isCurrent ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {step.delay_days} days, {step.delay_hours} hours delay
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {step.custom_message ? 'Custom Message' : 'AI Generated Message'} • Skip Weekends: {step.send_on_weekends ? 'No' : 'Yes'}
                      </p>
                      {step.custom_message && (
                        <div className="mt-2 text-xs bg-slate-50 p-2 rounded text-slate-600 line-clamp-2">
                          "{step.custom_message}"
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {enrollments.length > (activeEnrollment ? 1 : 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6">
          <h3 className="font-semibold text-slate-800 mb-4">Past Enrollments</h3>
          <div className="space-y-4">
            {enrollments.filter((e: any) => e.id !== activeEnrollment?.id).map((enrollment: any) => (
              <div key={enrollment.id} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                <div>
                  <div className="font-medium text-slate-700">{enrollment.followup_sequences.name}</div>
                  <div className="text-xs text-slate-500">
                    Reached step {enrollment.current_step} • {format(new Date(enrollment.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  enrollment.status === 'completed' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {enrollment.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
