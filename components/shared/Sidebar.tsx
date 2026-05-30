'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, Clock, Settings, LogOut, Menu, X, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Meetings', href: '/meetings', icon: Calendar },
  { name: 'Follow-ups', href: '/follow-ups', icon: Clock },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)
  const { workspaceName, workspaceLogo } = useWorkspace()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email || '')
    })
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#f4f5f7] text-slate-800 w-64 p-5 transition-all duration-300">
      {/* Brand Section */}
      <div className="flex items-center gap-3 mb-10 px-2">
        {workspaceLogo ? (
          <img src={workspaceLogo} alt={workspaceName} className="w-11 h-11 object-contain" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-slate-950 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-sm">
            {workspaceName.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-extrabold text-slate-900 tracking-tight leading-none mb-1 line-clamp-1">
            {workspaceName}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Sales Dashboard
          </span>
        </div>
      </div>
      
      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center px-4 py-3.5 rounded-2xl text-xs font-extrabold transition-all duration-300 ${
                  isActive 
                    ? 'bg-white text-slate-950 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100/50' 
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200/40'
                }`}
              >
                <Icon className={`mr-3 h-4.5 w-4.5 flex-shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
      
      {/* User Section */}
      <div className="mt-auto pt-4 border-t border-slate-200/60">
        <div className="flex items-center justify-between bg-white/60 rounded-2xl p-3 border border-slate-100/80 shadow-sm">
          <div className="flex flex-col truncate pr-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Account</span>
            <div className="text-xs font-extrabold text-slate-800 truncate" title={email}>{email.split('@')[0]}</div>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 rounded-xl bg-slate-950 text-white hover:bg-rose-600 transition-colors shadow-sm"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 bg-slate-950 rounded-xl text-white shadow-md border border-white/10"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block h-full border-r border-slate-200/50 bg-[#f4f5f7]">
        <SidebarContent />
      </div>

      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden`}>
        <SidebarContent />
      </div>
    </>
  )
}
