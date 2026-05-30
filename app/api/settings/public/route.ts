import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/settings'

// This endpoint is public and only returns safe branding info
export async function GET() {
  try {
    const settings = await getSettings()
    
    return NextResponse.json({ 
      data: {
        app_name: settings.app_name || 'LeadPilot',
        app_logo_url: settings.app_logo_url || null
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
