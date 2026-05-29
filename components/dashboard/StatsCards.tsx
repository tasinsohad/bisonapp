'use client'

import { useState, useEffect } from 'react'
import { Users, Calendar as CalendarIcon, Activity, MessageSquare } from 'lucide-react'

export function StatsCards({ stats }: { stats: any }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates between -1 and 1
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      
      requestAnimationFrame(() => {
        setMousePos({ x, y })
      })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const cards = [
    {
      title: 'Total Leads',
      value: stats?.total_leads || 0,
      icon: Users,
      color: 'text-orange-500 bg-orange-50 border-orange-100',
    },
    {
      title: 'Meetings (Month)',
      value: stats?.meetings_this_month || 0,
      icon: CalendarIcon,
      color: 'text-blue-500 bg-blue-50 border-blue-100',
    },
    {
      title: 'Active Follow-ups',
      value: stats?.active_enrollments || 0,
      icon: Activity,
      color: 'text-indigo-500 bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Replies Today',
      value: stats?.replies_today || 0,
      icon: MessageSquare,
      color: 'text-emerald-500 bg-emerald-50 border-emerald-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 perspective-1000">
      {cards.map((card, idx) => {
        const Icon = card.icon
        // Slightly offset the rotation for each card so they don't look perfectly identical
        const offsetMultiplier = 1 + (idx * 0.1)
        
        return (
          <div 
            key={idx} 
            className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.012)] p-6 flex flex-col justify-between hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:border-blue-100 transition-all duration-200 ease-out transform-gpu cursor-default relative overflow-hidden group"
            style={{ 
              transform: `perspective(1000px) rotateX(${mousePos.y * -8 * offsetMultiplier}deg) rotateY(${mousePos.x * 8 * offsetMultiplier}deg) scale(1)`,
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Subtle interactive hover highlight */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 pointer-events-none mix-blend-overlay"></div>

            <div className="flex justify-between items-start relative z-10" style={{ transform: 'translateZ(20px)' }}>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block transition-colors group-hover:text-slate-500">
                  {card.title}
                </span>
                <span className="text-4xl font-extrabold tracking-tight text-slate-950 block">
                  {card.value}
                </span>
              </div>
              <div className={`p-3 rounded-2xl border ${card.color} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-1.5 relative z-10" style={{ transform: 'translateZ(10px)' }}>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Live updates active
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
