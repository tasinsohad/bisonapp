'use client'

import { useState, useEffect } from 'react'
import { Plus, Settings, Users, ArrowRight, Play, Trash2, Edit2, X, Clock } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'

export default function FollowupsPage() {
  const [sequences, setSequences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [showBulkEnroll, setShowBulkEnroll] = useState(false)
  
  const { toast } = useToast()

  const fetchSequences = async () => {
    try {
      const res = await fetch('/api/followup/sequences')
      const d = await res.json()
      if (d.data) setSequences(d.data)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSequences()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sequence?')) return
    
    try {
      const res = await fetch(`/api/followup/sequences/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast('Sequence deleted', 'success')
        fetchSequences()
      } else {
        const d = await res.json()
        toast(d.error, 'error')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/followup/sequences/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current })
      })
      if (res.ok) fetchSequences()
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Follow-up Sequences</h1>
          <p className="text-slate-500">Automate your outreach with AI-generated or custom messages.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowBulkEnroll(true)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 flex items-center transition-colors"
          >
            <Users className="w-4 h-4 mr-2" />
            Bulk Enroll
          </button>
          <button 
            onClick={() => setShowBuilder(true)}
            className="px-4 py-2 bg-indigo-600 border border-transparent text-white rounded-lg shadow-sm hover:bg-indigo-700 flex items-center transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Sequence
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full h-32 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : sequences.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Clock className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">No sequences yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">Create a sequence to automate follow-up emails to your leads.</p>
            <button 
              onClick={() => setShowBuilder(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors mx-auto"
            >
              Create Sequence
            </button>
          </div>
        ) : (
          sequences.map(seq => (
            <div key={seq.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group">
              <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg mb-1">{seq.name}</h3>
                  <div className="flex items-center text-xs text-slate-500 space-x-3">
                    <span className="flex items-center"><Play className="w-3 h-3 mr-1" /> {seq.steps.length} Steps</span>
                    <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> {seq.enrollments_count} Active</span>
                  </div>
                </div>
                <div className="relative inline-flex items-center cursor-pointer" onClick={() => toggleActive(seq.id, seq.is_active)}>
                  <div className={`w-11 h-6 rounded-full transition-colors ${seq.is_active ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${seq.is_active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </div>
              
              <div className="p-5 flex-1 bg-slate-50/50">
                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {seq.steps.slice(0, 3).map((step: any, i: number) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-[10px] font-bold z-10">
                        {i + 1}
                      </div>
                      <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-white p-2.5 rounded border border-slate-200 shadow-sm text-xs">
                        <div className="font-medium text-slate-700 mb-1">+{step.delay_days}d {step.delay_hours}h</div>
                        <div className="text-slate-500 truncate">{step.custom_message ? 'Custom' : 'AI Agent'}</div>
                      </div>
                    </div>
                  ))}
                  {seq.steps.length > 3 && (
                    <div className="text-center text-xs text-slate-400 pt-2 relative z-10 bg-slate-50/50 inline-block px-2 ml-1 md:mx-auto md:block w-max">
                      +{seq.steps.length - 3} more steps
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(seq.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" 
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showBuilder && (
        <SequenceBuilder onClose={() => { setShowBuilder(false); fetchSequences(); }} />
      )}
      
      {showBulkEnroll && (
        <BulkEnrollModal 
          sequences={sequences.filter(s => s.is_active)} 
          onClose={() => setShowBulkEnroll(false)} 
        />
      )}
    </div>
  )
}

function SequenceBuilder({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [steps, setSteps] = useState<any[]>([
    { delay_days: 2, delay_hours: 0, send_on_weekends: false, custom_message: '' }
  ])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (!name.trim()) return toast('Name is required', 'error')
    setSaving(true)
    try {
      const res = await fetch('/api/followup/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, steps, is_active: true })
      })
      if (res.ok) {
        toast('Sequence created', 'success')
        onClose()
      } else {
        const d = await res.json()
        toast(d.error, 'error')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setSteps(newSteps)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-in-up">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-slate-800">Build Sequence</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Sequence Name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Post-Demo Follow-up"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Steps</label>
            {steps.map((step, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-5 relative">
                <div className="absolute -left-3 -top-3 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                  {index + 1}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Delay (Days)</label>
                    <input type="number" min="0" value={step.delay_days} onChange={e => updateStep(index, 'delay_days', parseInt(e.target.value) || 0)} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Delay (Hours)</label>
                    <input type="number" min="0" max="23" value={step.delay_hours} onChange={e => updateStep(index, 'delay_hours', parseInt(e.target.value) || 0)} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 text-sm" />
                  </div>
                  <div className="col-span-2 flex items-center mt-6">
                    <label className="flex items-center text-sm text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={!step.send_on_weekends} onChange={e => updateStep(index, 'send_on_weekends', !e.target.checked)} className="mr-2 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                      Skip Weekends
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Custom Message (Leave blank for AI-generated)</label>
                  <textarea 
                    value={step.custom_message}
                    onChange={e => updateStep(index, 'custom_message', e.target.value)}
                    placeholder="Hi {{first_name}}, just following up on my previous email..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 text-sm resize-none"
                  />
                </div>
                
                {steps.length > 1 && (
                  <button onClick={() => setSteps(steps.filter((_, i) => i !== index))} className="mt-3 text-xs text-rose-600 hover:text-rose-700 font-medium">
                    Remove Step
                  </button>
                )}
              </div>
            ))}
          </div>

          <button 
            onClick={() => setSteps([...steps, { delay_days: 2, delay_hours: 0, send_on_weekends: false, custom_message: '' }])}
            className="mt-4 px-4 py-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg w-full hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Step
          </button>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Sequence'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkEnrollModal({ sequences, onClose }: { sequences: any[], onClose: () => void }) {
  const [seqId, setSeqId] = useState('')
  const [statusFilter, setStatusFilter] = useState('new')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleEnroll = async () => {
    if (!seqId) return toast('Select a sequence', 'error')
    setSaving(true)
    try {
      const res = await fetch('/api/followup/bulk-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence_id: seqId, status_filter: statusFilter })
      })
      const d = await res.json()
      if (res.ok) {
        toast(`Successfully enrolled ${d.enrolledCount} leads`, 'success')
        onClose()
      } else {
        toast(d.error, 'error')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-in-up">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-slate-800 flex items-center"><Users className="w-5 h-5 mr-2 text-indigo-600" /> Bulk Enroll</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Leads with Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="new">New</option>
              <option value="engaged">Engaged</option>
              <option value="ghosted">Ghosted</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Enroll in Sequence</label>
            <select value={seqId} onChange={e => setSeqId(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="">Select...</option>
              {sequences.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            This will only enroll leads that are not currently active in another sequence.
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleEnroll} disabled={saving || !seqId} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
            {saving ? 'Processing...' : 'Enroll Leads'}
          </button>
        </div>
      </div>
    </div>
  )
}
