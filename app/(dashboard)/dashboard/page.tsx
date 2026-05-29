'use client'

import { useState, useEffect } from 'react'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { LeadPipeline } from '@/components/dashboard/LeadPipeline'
import { useToast } from '@/components/shared/Toast'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => {
        if (d.data) setStats(d.data)
        if (d.error) toast(d.error, 'error')
      })
      .catch(e => toast(e.message, 'error'))
  }, [toast])

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-500">Welcome back. Here's what's happening with your outreach.</p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <LeadPipeline />
        </div>
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Activity Feed</h2>
          <ActivityFeed />
        </div>
      </div>
    </div>
  )
}
