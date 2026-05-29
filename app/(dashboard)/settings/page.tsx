'use client'

import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Mail, Bot, Calendar, MessageSquare, Clock, Webhook, Shield } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'

import { BisonSettings } from '@/components/settings/BisonSettings'
import { AISettings } from '@/components/settings/AISettings'
import { CalSettings } from '@/components/settings/CalSettings'
import { PromptsSettings } from '@/components/settings/PromptsSettings'
import { FollowupDefaults } from '@/components/settings/FollowupDefaults'
import { WebhookSettings } from '@/components/settings/WebhookSettings'
import { GeneralSettings } from '@/components/settings/GeneralSettings'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('bison')
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const d = await res.json()
      if (d.data) setSettings(d.data)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        toast('Settings saved successfully', 'success')
      } else {
        const d = await res.json()
        toast(d.error || 'Failed to save', 'error')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  const tabs = [
    { id: 'bison', label: 'Email Bison', icon: Mail },
    { id: 'ai', label: 'AI Models', icon: Bot },
    { id: 'cal', label: 'Calendar', icon: Calendar },
    { id: 'prompts', label: 'Prompts', icon: MessageSquare },
    { id: 'followup', label: 'Follow-ups', icon: Clock },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'general', label: 'General', icon: Shield },
  ]

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8 flex items-center">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mr-4">
          <SettingsIcon className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Settings</h1>
          <p className="text-slate-500">Manage integrations and system preferences.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8">
            {activeTab === 'bison' && <BisonSettings settings={settings} setSettings={setSettings} onSave={handleSave} />}
            {activeTab === 'ai' && <AISettings settings={settings} setSettings={setSettings} onSave={handleSave} />}
            {activeTab === 'cal' && <CalSettings settings={settings} setSettings={setSettings} onSave={handleSave} />}
            {activeTab === 'prompts' && <PromptsSettings settings={settings} setSettings={setSettings} onSave={handleSave} />}
            {activeTab === 'followup' && <FollowupDefaults settings={settings} setSettings={setSettings} onSave={handleSave} />}
            {activeTab === 'webhooks' && <WebhookSettings settings={settings} setSettings={setSettings} onSave={handleSave} />}
            {activeTab === 'general' && <GeneralSettings settings={settings} setSettings={setSettings} onSave={handleSave} />}
          </div>
        </div>
      </div>
    </div>
  )
}
