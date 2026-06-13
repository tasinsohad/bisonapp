'use client'

import { useState } from 'react'
import { Save, RotateCcw, Loader2 } from 'lucide-react'

export function PromptsSettings({ settings, setSettings, onSave }: any) {
  const [resetting, setResetting] = useState(false)
  
  const resetPrompts = async () => {
    if(!confirm('Are you sure you want to reset to default prompts? This will replace both prompts with the O Growth Labs V2 templates and save immediately.')) {
      return
    }
    
    setResetting(true)
    try {
      const res = await fetch('/api/settings/reset-prompts', { method: 'POST' })
      const data = await res.json()
      
      if (data.success) {
        setSettings({
          ...settings,
          appt_setter_system_prompt: data.appt_setter_system_prompt,
          followup_agent_system_prompt: data.followup_agent_system_prompt,
        })
        alert('Prompts reset and saved successfully!')
      } else {
        alert('Failed to reset prompts: ' + (data.error || 'Unknown error'))
      }
    } catch (e: any) {
      alert('Failed to reset prompts: ' + e.message)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium leading-6 text-slate-900">AI Prompts</h3>
          <p className="mt-1 text-sm text-slate-500">Customize the behavior of the Appointment Setter and Follow-up agents.</p>
        </div>
        <button 
          onClick={resetPrompts} 
          disabled={resetting}
          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center disabled:opacity-50"
        >
          {resetting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
          {resetting ? 'Resetting...' : 'Reset to defaults'}
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Appointment Setter Prompt</label>
          <div className="bg-slate-50 border border-slate-200 rounded-t-lg p-3 text-xs font-mono text-slate-600">
            Available variables: {'{{leadFirstName}}'}, {'{{leadName}}'}, {'{{leadCompany}}'}, {'{{leadIndustry}}'}, {'{{leadTitle}}'}, {'{{leadWebsite}}'}, {'{{leadCountry}}'}, {'{{calLink}}'}, {'{{senderName}}'}, {'{{senderEmail}}'}, {'{{campaignName}}'}, {'{{companyResearch}}'}, {'{{conversationThread}}'}
          </div>
          <textarea
            value={settings.appt_setter_system_prompt || ''}
            onChange={(e) => setSettings({ ...settings, appt_setter_system_prompt: e.target.value })}
            rows={16}
            className="w-full px-4 py-3 font-mono text-sm bg-slate-900 text-slate-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Follow-up Agent Prompt</label>
          <div className="bg-slate-50 border border-slate-200 rounded-t-lg p-3 text-xs font-mono text-slate-600">
            Available variables: {'{{leadFirstName}}'}, {'{{leadName}}'}, {'{{leadCompany}}'}, {'{{leadIndustry}}'}, {'{{senderName}}'}, {'{{companyResearch}}'}, {'{{conversationThread}}'}, {'{{stepNumber}}'}, {'{{totalSteps}}'}
          </div>
          <textarea
            value={settings.followup_agent_system_prompt || ''}
            onChange={(e) => setSettings({ ...settings, followup_agent_system_prompt: e.target.value })}
            rows={10}
            className="w-full px-4 py-3 font-mono text-sm bg-slate-900 text-slate-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <button
          onClick={onSave}
          className="flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="w-4 h-4 mr-2" /> Save Settings
        </button>
      </div>
    </div>
  )
}
