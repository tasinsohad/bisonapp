import { createServerClient } from '@/lib/supabase/server'

let settingsCache: Record<string, string> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30_000 // 30 seconds

export async function getSettings(): Promise<Record<string, string>> {
  const now = Date.now()
  if (settingsCache && now - cacheTimestamp < CACHE_TTL) {
    return settingsCache
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')

  if (error) {
    console.error('Failed to load settings:', error)
    return settingsCache || {}
  }

  const settings: Record<string, string> = {}
  for (const row of data || []) {
    settings[row.key] = row.value || ''
  }

  settingsCache = settings
  cacheTimestamp = now
  return settings
}

export async function getSetting(key: string): Promise<string> {
  const settings = await getSettings()
  return settings[key] || ''
}

export async function saveSettings(updates: Record<string, string>): Promise<void> {
  const supabase = createServerClient()

  for (const [key, value] of Object.entries(updates)) {
    await supabase
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  }

  // Invalidate cache
  settingsCache = null
  cacheTimestamp = 0
}

export function invalidateSettingsCache() {
  settingsCache = null
  cacheTimestamp = 0
}
