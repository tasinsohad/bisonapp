import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/settings'

export async function GET(request: NextRequest) {
  try {
    const settings = await getSettings()
    return NextResponse.json({ data: settings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    await saveSettings(body)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
