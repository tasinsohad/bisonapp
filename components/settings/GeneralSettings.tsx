'use client'

import { Save, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '@/components/shared/Toast'

export function GeneralSettings({ settings, setSettings, onSave }: any) {
  const supabase = createClient()
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/settings/upload-logo', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to upload logo')

      setSettings({ ...settings, app_logo_url: data.url })
      toast('Logo uploaded successfully! Make sure to save settings.', 'success')
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium leading-6 text-slate-900">General</h3>
        <p className="mt-1 text-sm text-slate-500">Manage your account and overall platform settings.</p>
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 border-b border-slate-100 pb-6">
        <div className="sm:col-span-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Company / Workspace Name</label>
          <input
            type="text"
            value={settings.app_name || ''}
            onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
            placeholder="Acme Corp"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="sm:col-span-4 mt-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Workspace Logo</label>
          <div className="flex items-center gap-4 mt-2">
            {settings.app_logo_url ? (
              <img src={settings.app_logo_url} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                Logo
              </div>
            )}
            <label className={`cursor-pointer px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}>
              <span>{isUploading ? 'Uploading...' : 'Upload Logo'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={handleLogoUpload}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-500">Logo will be used as the app icon and favicon.</p>
        </div>

        <div className="sm:col-span-4 mt-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Inbound Reply Delay (Minutes)</label>
          <p className="text-xs text-slate-500 mb-2">How long the AI should wait before replying to a prospect. Set to 0 for instant replies. Requires the background Cron to be running.</p>
          <input
            type="number"
            min="0"
            value={settings.inbound_reply_delay_minutes || '5'}
            onChange={(e) => setSettings({ ...settings, inbound_reply_delay_minutes: e.target.value })}
            className="w-full max-w-[120px] px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={onSave}
          className="flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 mb-8"
        >
          <Save className="w-4 h-4 mr-2" /> Save Settings
        </button>
      </div>

      <div className="border border-rose-200 rounded-xl overflow-hidden">
        <div className="bg-rose-50 px-6 py-4 border-b border-rose-100">
          <h4 className="text-rose-800 font-medium">Danger Zone</h4>
        </div>
        <div className="p-6 bg-white space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium text-slate-900">Sign Out</div>
              <div className="text-sm text-slate-500">Sign out of the current session on this device.</div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
