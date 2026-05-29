'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/shared/Toast'
import { Save, User, Building, MapPin, Target, DollarSign, Globe } from 'lucide-react'

export function LeadOverview({ lead, setLead, fetchLead }: { lead: any, setLead: any, fetchLead: any }) {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    first_name: lead.first_name || '',
    last_name: lead.last_name || '',
    title: lead.title || '',
    company: lead.company || '',
    website: lead.website || '',
    industry: lead.industry || '',
    country: lead.country || '',
    annual_revenue: lead.annual_revenue || '',
    notes: lead.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('leads')
        .update(formData)
        .eq('id', lead.id)

      if (error) throw error
      
      toast('Lead updated successfully', 'success')
      setEditing(false)
      fetchLead()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const customVars = lead.custom_variables || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Contact Details</h2>
            {editing ? (
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center transition-colors"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                <User className="w-3 h-3 mr-1" /> First Name
              </label>
              {editing ? (
                <input 
                  type="text" 
                  value={formData.first_name} 
                  onChange={e => setFormData({...formData, first_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              ) : (
                <div className="text-sm text-slate-900 py-1">{lead.first_name || '-'}</div>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                <User className="w-3 h-3 mr-1" /> Last Name
              </label>
              {editing ? (
                <input 
                  type="text" 
                  value={formData.last_name} 
                  onChange={e => setFormData({...formData, last_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              ) : (
                <div className="text-sm text-slate-900 py-1">{lead.last_name || '-'}</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                <Building className="w-3 h-3 mr-1" /> Title
              </label>
              {editing ? (
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              ) : (
                <div className="text-sm text-slate-900 py-1">{lead.title || '-'}</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                <Building className="w-3 h-3 mr-1" /> Company
              </label>
              {editing ? (
                <input 
                  type="text" 
                  value={formData.company} 
                  onChange={e => setFormData({...formData, company: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              ) : (
                <div className="text-sm text-slate-900 py-1">{lead.company || '-'}</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                <Globe className="w-3 h-3 mr-1" /> Website
              </label>
              {editing ? (
                <input 
                  type="text" 
                  value={formData.website} 
                  onChange={e => setFormData({...formData, website: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              ) : (
                <div className="text-sm text-indigo-600 py-1 hover:underline cursor-pointer">
                  {lead.website ? <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer">{lead.website}</a> : '-'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                <Target className="w-3 h-3 mr-1" /> Industry
              </label>
              {editing ? (
                <input 
                  type="text" 
                  value={formData.industry} 
                  onChange={e => setFormData({...formData, industry: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              ) : (
                <div className="text-sm text-slate-900 py-1">{lead.industry || '-'}</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                <MapPin className="w-3 h-3 mr-1" /> Country
              </label>
              {editing ? (
                <input 
                  type="text" 
                  value={formData.country} 
                  onChange={e => setFormData({...formData, country: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              ) : (
                <div className="text-sm text-slate-900 py-1">{lead.country || '-'}</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                <DollarSign className="w-3 h-3 mr-1" /> Annual Revenue
              </label>
              {editing ? (
                <input 
                  type="text" 
                  value={formData.annual_revenue} 
                  onChange={e => setFormData({...formData, annual_revenue: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              ) : (
                <div className="text-sm text-slate-900 py-1">{lead.annual_revenue || '-'}</div>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
            {editing ? (
              <textarea 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
              />
            ) : (
              <div className="text-sm text-slate-900 py-2 px-3 bg-slate-50 rounded-md min-h-[60px]">
                {lead.notes || <span className="text-slate-400 italic">No notes</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Bison Sync Info</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500">Campaign</div>
              <div className="text-sm font-medium text-slate-900 truncate" title={lead.bison_campaign_name || ''}>
                {lead.bison_campaign_name || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Instance</div>
              <div className="text-sm font-medium text-slate-900 truncate">
                {lead.bison_instance_url || 'Default'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-slate-500">Lead ID</div>
                <div className="text-sm font-medium text-slate-900">{lead.bison_lead_id || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Reply ID</div>
                <div className="text-sm font-medium text-slate-900">{lead.bison_reply_id || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        {customVars.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Custom Variables</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {customVars.map((v: any, i: number) => (
                <div key={i} className="bg-slate-50 rounded p-2 text-xs">
                  <div className="font-medium text-slate-500 mb-0.5">{v.name}</div>
                  <div className="text-slate-900 break-all">{v.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
