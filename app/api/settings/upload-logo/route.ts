import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is logged in
    const userClient = createServerClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 3. Upload using admin client to bypass RLS policies
    const adminClient = createAdminClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'png'
    const fileName = `logo_${Date.now()}.${ext}`

    const { data, error } = await adminClient
      .storage
      .from('workspace')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 4. Get public URL
    const { data: publicUrlData } = adminClient
      .storage
      .from('workspace')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrlData.publicUrl })
  } catch (error: any) {
    console.error('API upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
