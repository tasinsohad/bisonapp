'use client'

import { useState, useEffect } from 'react'
import { Save, RefreshCw, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'

export function AISettings({ settings, setSettings, onSave }: any) {
  const [models, setModels] = useState<{ id: string; name: string }[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const { toast } = useToast()

  const provider = settings.ai_provider || 'openai'

  // Determine active key for currently selected provider
  const getActiveKey = () => {
    switch (provider) {
      case 'openai': return settings.openai_api_key || ''
      case 'gemini': return settings.gemini_api_key || ''
      case 'anthropic': return settings.anthropic_api_key || ''
      case 'openrouter': return settings.openrouter_api_key || ''
      case 'custom': return settings.custom_api_key || ''
      default: return ''
    }
  }

  const activeKey = getActiveKey()
  const customBaseUrl = settings.custom_base_url || ''

  const fetchModels = async (showSuccess = false) => {
    // If not openrouter or anthropic, we strictly need an API key to do fetching
    if (provider !== 'openrouter' && provider !== 'anthropic' && !activeKey) {
      setModels([])
      return
    }

    setLoadingModels(true)
    try {
      const res = await fetch('/api/settings/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: activeKey,
          customBaseUrl,
        }),
      })

      const data = await res.json()
      if (res.ok && data.models) {
        setModels(data.models)
        if (showSuccess) {
          toast(`Successfully loaded ${data.models.length} models`, 'success')
        }
      } else {
        throw new Error(data.error || 'Failed to load models')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setLoadingModels(false)
    }
  }

  // Load models when provider, key, or base url changes
  useEffect(() => {
    fetchModels(false)
  }, [provider, activeKey, customBaseUrl])

  const handleProviderChange = (newProvider: string) => {
    setSettings({
      ...settings,
      ai_provider: newProvider,
      ai_model: '', // Clear model so they pick one from the new provider's list
    })
  }

  const handleKeyChange = (value: string) => {
    const keyName = `${provider}_api_key`
    setSettings({
      ...settings,
      [keyName]: value,
      // For backward compatibility, also write to the standard legacy openai_api_key field if using openai
      ...(provider === 'openai' ? { openai_api_key: value } : {}),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-slate-900">AI & External APIs</h3>
        <p className="mt-1 text-sm text-slate-500">Configure language models and enrichment tools.</p>
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">AI Provider</label>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="openrouter">OpenRouter</option>
            <option value="custom">Custom Provider (OpenAI Compatible)</option>
          </select>
        </div>

        {provider === 'custom' && (
          <div className="sm:col-span-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Custom Base URL</label>
            <input
              type="text"
              value={customBaseUrl}
              onChange={(e) => setSettings({ ...settings, custom_base_url: e.target.value })}
              placeholder="https://api.your-provider.com/v1"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-slate-500">The base URL of your OpenAI-compatible API endpoint.</p>
          </div>
        )}

        <div className="sm:col-span-4">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-slate-700">
              {provider === 'openai' && 'OpenAI API Key'}
              {provider === 'gemini' && 'Gemini API Key'}
              {provider === 'anthropic' && 'Anthropic API Key'}
              {provider === 'openrouter' && 'OpenRouter API Key'}
              {provider === 'custom' && 'Custom API Key'}
            </label>
            {provider !== 'anthropic' && provider !== 'openrouter' && !activeKey && (
              <span className="text-xs text-amber-600 flex items-center font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Key required to load models
              </span>
            )}
          </div>
          <input
            type="password"
            value={activeKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder={
              provider === 'openai' ? 'sk-...' :
              provider === 'gemini' ? 'AIzaSy...' :
              provider === 'anthropic' ? 'sk-ant-...' :
              provider === 'openrouter' ? 'sk-or-...' : 'Key value...'
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="sm:col-span-4">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-slate-700">AI Model</label>
            <button
              type="button"
              onClick={() => fetchModels(true)}
              disabled={loadingModels}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loadingModels ? 'animate-spin' : ''}`} />
              Refresh Models
            </button>
          </div>
          
          <select
            value={settings.ai_model || ''}
            onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Select a model...</option>
            {models.length > 0 ? (
              models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))
            ) : (
              <>
                <option value="gpt-4o">GPT-4o (Default Fallback)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fallback)</option>
                <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet (Fallback)</option>
              </>
            )}
          </select>
        </div>

        <div className="sm:col-span-4 pt-4 border-t border-slate-100">
          <h4 className="text-md font-medium text-slate-900 mb-3">Firecrawl (Optional Enrichment)</h4>
          <label className="block text-sm font-medium text-slate-700 mb-1">Firecrawl API Key</label>
          <input
            type="password"
            value={settings.firecrawl_api_key || ''}
            onChange={(e) => setSettings({ ...settings, firecrawl_api_key: e.target.value })}
            placeholder="fc-..."
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-slate-500">Used to scrape and summarize lead websites when a reply is received.</p>
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
