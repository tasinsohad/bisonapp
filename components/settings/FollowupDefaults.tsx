'use client'

import { Save } from 'lucide-react'

export function FollowupDefaults({ settings, setSettings, onSave }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-slate-900">Follow-up Defaults</h3>
        <p className="mt-1 text-sm text-slate-500">Configure global rules for follow-up sequences.</p>
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 border-b border-slate-100 pb-6">
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
          <select
            value={settings.app_timezone || 'America/New_York'}
            onChange={(e) => setSettings({ ...settings, app_timezone: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="Europe/London">London (GMT/BST)</option>
            <option value="Europe/Paris">Central Europe (CET)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 border-b border-slate-100 pb-6">
        <div className="sm:col-span-6">
          <h4 className="text-sm font-medium text-slate-900 mb-4">Send Window (Timezone Adjusted)</h4>
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">From Hour</label>
          <select
            value={settings.send_window_start || '9'}
            onChange={(e) => setSettings({ ...settings, send_window_start: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {[...Array(24)].map((_, i) => (
              <option key={i} value={i}>{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i-12} PM`}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">To Hour</label>
          <select
            value={settings.send_window_end || '18'}
            onChange={(e) => setSettings({ ...settings, send_window_end: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {[...Array(24)].map((_, i) => (
              <option key={i} value={i}>{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i-12} PM`}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-6 flex items-center">
          <input
            type="checkbox"
            checked={settings.auto_pause_on_reply === 'true'}
            onChange={(e) => setSettings({ ...settings, auto_pause_on_reply: e.target.checked ? 'true' : 'false' })}
            className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            id="auto_pause"
          />
          <label htmlFor="auto_pause" className="ml-2 block text-sm text-slate-900 font-medium">
            Automatically pause sequences when a lead replies
          </label>
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
