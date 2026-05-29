'use client'

import { useState } from 'react'
import { useToast } from '@/components/shared/Toast'
import { Save, RefreshCw, CheckCircle2 } from 'lucide-react'

export function CalSettings({ settings, setSettings, onSave }: any) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const { toast } = useToast()

  const handleTest = async () => {
    if (!settings.cal_api_key) {
      toast('Please enter Cal.com API Key', 'error')
      return
    }
    setTesting(true)
    setTestResult(null)
    
    try {
      const res = await fetch('/api/settings/test-cal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: settings.cal_api_key })
      })
      const d = await res.json()
      if (d.success) setTestResult({ success: true })
      else setTestResult({ success: false, error: d.error })
    } catch (e: any) {
      setTestResult({ success: false, error: e.message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-slate-900">Cal.com Integration</h3>
        <p className="mt-1 text-sm text-slate-500">Provide booking links to interested leads and track scheduled meetings.</p>
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Cal.com API Key</label>
          <input
            type="password"
            value={settings.cal_api_key || ''}
            onChange={(e) => setSettings({ ...settings, cal_api_key: e.target.value })}
            placeholder="cal_..."
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Booking URL (Base)</label>
          <input
            type="url"
            value={settings.cal_booking_url || ''}
            onChange={(e) => setSettings({ ...settings, cal_booking_url: e.target.value })}
            placeholder="https://cal.com/your-username/discovery-call"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-slate-500">The agent will provide this link when the lead asks to schedule.</p>
        </div>

        <div className="sm:col-span-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Event Type ID (Optional)</label>
          <input
            type="text"
            value={settings.cal_event_type_id || ''}
            onChange={(e) => setSettings({ ...settings, cal_event_type_id: e.target.value })}
            placeholder="e.g. 123456"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-slate-200">
        <button
          onClick={onSave}
          className="flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="w-4 h-4 mr-2" /> Save Settings
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex justify-center items-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50"
        >
          {testing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : 'Test Connection'}
        </button>
      </div>

      {testResult && (
        <div className={`p-4 rounded-lg flex items-start \${testResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {testResult.success ? (
            <><CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" /> Successfully authenticated with Cal.com API.</>
          ) : (
            <><span className="font-bold mr-1">Error:</span> {testResult.error}</>
          )}
        </div>
      )}
    </div>
  )
}
