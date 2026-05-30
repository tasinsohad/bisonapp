import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { provider, apiKey, customBaseUrl } = await request.json()

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
    }

    let models: { id: string; name: string }[] = []

    if (provider === 'openai') {
      if (!apiKey) return NextResponse.json({ models: [] })
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`OpenAI API error: ${errorText}`)
      }
      const data = await res.json()
      models = (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.id,
      }))
    } else if (provider === 'gemini') {
      if (!apiKey) return NextResponse.json({ models: [] })
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Gemini API error: ${errorText}`)
      }
      const data = await res.json()
      models = (data.models || []).map((m: any) => {
        const id = m.name.startsWith('models/') ? m.name.substring(7) : m.name
        return {
          id: m.name, // Keep full name like 'models/gemini-1.5-flash' for backend calls
          name: m.displayName || id,
        }
      })
    } else if (provider === 'anthropic') {
      const fallbackAnthropic = [
        { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet (Latest)' },
        { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku (Latest)' },
        { id: 'claude-3-opus-latest', name: 'Claude 3 Opus (Latest)' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      ]

      if (!apiKey) {
        return NextResponse.json({ models: fallbackAnthropic })
      }

      try {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
        })
        if (res.ok) {
          const data = await res.json()
          models = (data.data || []).map((m: any) => ({
            id: m.id,
            name: m.display_name || m.id,
          }))
        } else {
          models = fallbackAnthropic
        }
      } catch {
        models = fallbackAnthropic
      }
    } else if (provider === 'openrouter') {
      const headers: Record<string, string> = {}
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }
      const res = await fetch('https://openrouter.ai/api/v1/models', { headers })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`OpenRouter API error: ${errorText}`)
      }
      const data = await res.json()
      models = (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
      }))
    } else if (provider === 'custom') {
      if (!customBaseUrl) {
        return NextResponse.json({ models: [] })
      }
      const headers: Record<string, string> = {}
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }
      const baseUrl = customBaseUrl.endsWith('/') ? customBaseUrl.slice(0, -1) : customBaseUrl
      const res = await fetch(`${baseUrl}/models`, { headers })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Custom provider API error: ${errorText}`)
      }
      const data = await res.json()
      models = (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.id,
      }))
    }

    return NextResponse.json({ models })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
