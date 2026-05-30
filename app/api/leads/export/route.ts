import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const searchParams = request.nextUrl.searchParams
  
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const campaign = searchParams.get('campaign_id')

  let query = supabase
    .from('leads')
    .select(`*`)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }
  
  if (campaign) {
    query = query.eq('bison_campaign_id', campaign)
  }

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return new NextResponse('No leads found for export.', { status: 404 })
  }

  // Create CSV String
  const headers = ['First Name', 'Last Name', 'Email', 'Company', 'Title', 'Status', 'Campaign', 'Created At']
  
  const csvRows = []
  csvRows.push(headers.join(',')) // Add header row
  
  for (const lead of data) {
    const row = [
      `"${(lead.first_name || '').replace(/"/g, '""')}"`,
      `"${(lead.last_name || '').replace(/"/g, '""')}"`,
      `"${(lead.email || '').replace(/"/g, '""')}"`,
      `"${(lead.company || '').replace(/"/g, '""')}"`,
      `"${(lead.title || '').replace(/"/g, '""')}"`,
      `"${(lead.status || '').replace(/"/g, '""')}"`,
      `"${(lead.bison_campaign_name || '').replace(/"/g, '""')}"`,
      `"${(lead.created_at || '').replace(/"/g, '""')}"`
    ]
    csvRows.push(row.join(','))
  }

  const csvContent = csvRows.join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="leads_export_${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}
