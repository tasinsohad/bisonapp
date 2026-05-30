'use client'

import { useState, useRef } from 'react'
import { Users, Calendar as CalendarIcon, Activity, MessageSquare } from 'lucide-react'

function StatCard({ card }: { card: any }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [rotate, setRotate] = useState({ x: 0, y: 0 })
  const Icon = card.icon

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    // Calculate mouse position relative to the center of the card
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2

    // Dampen the rotation for a smooth effect
    setRotate({
      x: -(y / rect.height) * 15, // Max rotation 15deg
      y: (x / rect.width) * 15
    })
  }

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 })
  }

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={card.onClick}
      className={`bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.012)] p-6 flex flex-col justify-between hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:border-blue-100 transition-all duration-300 ease-out transform-gpu relative overflow-hidden group ${card.onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ 
        transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(${rotate.x || rotate.y ? 1.02 : 1})`,
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Subtle interactive hover highlight */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-50/30 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 pointer-events-none mix-blend-overlay"></div>

      <div className="flex justify-between items-start relative z-10" style={{ transform: 'translateZ(20px)' }}>
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block transition-colors group-hover:text-slate-500">
            {card.title}
          </span>
          <span className="text-4xl font-extrabold tracking-tight text-slate-950 block">
            {card.value}
          </span>
        </div>
        <div className={`p-3 rounded-2xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm ${card.color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-1.5 relative z-10" style={{ transform: 'translateZ(10px)' }}>
        <div className={`w-2 h-2 rounded-full animate-pulse ${card.pulseColor || 'bg-emerald-500'}`}></div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {card.footerText || 'Live updates active'}
        </span>
      </div>
    </div>
  )
}

import { AlertOctagon } from 'lucide-react'

export function StatsCards({ stats, onFailedClick }: { stats: any, onFailedClick?: () => void }) {
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
    {
      title: 'Failed Ops',
      value: stats?.failed_operations || 0,
      icon: AlertOctagon,
      color: 'text-rose-500 bg-rose-50 border-rose-100',
      pulseColor: 'bg-rose-500',
      footerText: 'Click for details',
      onClick: onFailedClick,
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 perspective-1000">
      {cards.map((card, idx) => (
        <StatCard key={idx} card={card} />
      ))}
    </div>
  )
}
