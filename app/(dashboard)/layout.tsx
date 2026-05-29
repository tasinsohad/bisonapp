'use client'

import Sidebar from '@/components/shared/Sidebar'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setLoading(false)
      }
    }
    checkUser()
  }, [router, supabase])

  // Dashboard Heartbeat (Internal Cron Replacement for Hobby Tier)
  useEffect(() => {
    const runCrons = async () => {
      try {
        // Ping the background endpoints silently
        await fetch('/api/cron/process-followups', { method: 'POST' })
        await fetch('/api/cron/sync-threads', { method: 'POST' })
      } catch (err) {
        console.error('Internal heartbeat failed:', err)
      }
    }

    // Delay the first run by 5 seconds to not block initial render
    const initialTimeout = setTimeout(runCrons, 5000)
    
    // Run every 15 minutes (900,000 ms) while the dashboard is open
    const intervalId = setInterval(runCrons, 900000)
    
    return () => {
      clearTimeout(initialTimeout)
      clearInterval(intervalId)
    }
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f5f7] text-slate-900 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full p-3 md:p-5 lg:p-6">
        <div className="bg-white rounded-[32px] min-h-full w-full shadow-[0_8px_40px_rgba(0,0,0,0.015)] border border-slate-100/50 p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
