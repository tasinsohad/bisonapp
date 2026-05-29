'use client'

import { useState, useEffect } from 'react'
import { Save, Copy, Check } from 'lucide-react'

export function WebhookSettings({ settings, setSettings, onSave }: any) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhooks/bison`)
    }
  }, [])

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let secret = ''
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setSettings({ ...settings, webhook_secret: secret })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-slate-900">Webhook Configuration</h3>
        <p className="mt-1 text-sm text-slate-500">Configure Email Bison to send data to LeadPilot in real-time.</p>
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 border-b border-slate-100 pb-6">
        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-600 font-mono text-sm"
            />
            <button
              onClick={copyUrl}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Paste this URL into your Email Bison instance under Settings &gt; Developer &gt; Webhooks.
          </p>
        </div>

        <div className="sm:col-span-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Webhook Secret (HMAC)</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={settings.webhook_secret || ''}
              onChange={(e) => setSettings({ ...settings, webhook_secret: e.target.value })}
              placeholder="Leave blank to disable verification"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={generateSecret}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              Generate
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Optional but recommended. If set, LeadPilot will verify that incoming webhooks were actually sent by Email Bison.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="font-medium text-slate-800 mb-2 text-sm">Events to subscribe to in Email Bison:</h4>
        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
          <li><code>LEAD_INTERESTED</code></li>
          <li><code>CONTACT_REPLIED</code></li>
          <li><code>EMAIL_BOUNCED</code></li>
          <li><code>CONTACT_UNSUBSCRIBED</code></li>
          <li><code>EMAIL_OPENED</code> (Optional)</li>
        </ul>
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
