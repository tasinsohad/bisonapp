import React from 'react'

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-slate-100 text-slate-700 border-slate-200',
    engaged: 'bg-blue-100 text-blue-700 border-blue-200',
    meeting_scheduled: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ghosted: 'bg-amber-100 text-amber-700 border-amber-200',
    done: 'bg-violet-100 text-violet-700 border-violet-200',
    unsubscribed: 'bg-rose-100 text-rose-700 border-rose-200',
  }

  const defaultStyle = 'bg-gray-100 text-gray-700 border-gray-200'
  const style = styles[status] || defaultStyle

  const label = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {label}
    </span>
  )
}
