import { NextRequest, NextResponse } from 'next/server'
import { testBisonConnection } from '@/lib/bison'

export async function POST(request: NextRequest) {
  try {
    const { instance_url, api_key } = await request.json()

    if (!instance_url || !api_key) {
      return NextResponse.json({ error: 'Instance URL and API Key are required' }, { status: 400 })
    }

    const result = await testBisonConnection({
      instanceUrl: instance_url,
      apiKey: api_key
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
