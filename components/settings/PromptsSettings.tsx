'use client'

import { Save, RotateCcw } from 'lucide-react'

export function PromptsSettings({ settings, setSettings, onSave }: any) {
  
  const resetPrompts = () => {
    if(confirm('Are you sure you want to reset to default prompts?')) {
      setSettings({
        ...settings,
        system_prompt_setter: 'You are an AI sales assistant...', // Truncated for brevity, normally you'd put the default here
        system_prompt_followup: 'You are an AI sales assistant...'
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium leading-6 text-slate-900">AI Prompts</h3>
          <p className="mt-1 text-sm text-slate-500">Customize the behavior of the Appointment Setter and Follow-up agents.</p>
        </div>
        <button onClick={resetPrompts} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
          <RotateCcw className="w-4 h-4 mr-1" /> Reset to defaults
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Appointment Setter Prompt</label>
          <div className="bg-slate-50 border border-slate-200 rounded-t-lg p-3 text-xs font-mono text-slate-600">
            Available variables: {'{{lead.first_name}}'}, {'{{lead.company}}'}, {'{{calendar_link}}'}, {'{{bison_sender_email_name}}'}
          </div>
          <textarea
            value={settings.system_prompt_setter || ''}
            onChange={(e) => setSettings({ ...settings, system_prompt_setter: e.target.value })}
            rows={10}
            className="w-full px-4 py-3 font-mono text-sm bg-slate-900 text-slate-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Follow-up Agent Prompt</label>
          <textarea
            value={settings.system_prompt_followup || ''}
            onChange={(e) => setSettings({ ...settings, system_prompt_followup: e.target.value })}
            rows={8}
            className="w-full px-4 py-3 font-mono text-sm bg-slate-900 text-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
