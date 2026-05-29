import { NextRequest, NextResponse } from 'next/server'
import { testCalConnection } from '@/lib/cal'

export async function POST(request: NextRequest) {
  try {
    const { api_key } = await request.json()

    if (!api_key) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 })
    }

    const result = await testCalConnection(api_key)

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
