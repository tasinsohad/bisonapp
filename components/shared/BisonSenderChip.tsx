import React from 'react'

export function BisonSenderChip({ email, name }: { email: string | null; name?: string | null }) {
  if (!email) return <span className="text-xs text-gray-400 italic">None</span>

  return (
    <div 
      className="inline-flex items-center px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-[150px]"
      title={`${name ? name + ' <' + email + '>' : email}`}
    >
      <span className="w-2 h-2 rounded-full bg-indigo-400 mr-1.5 flex-shrink-0"></span>
      <span className="truncate">{email}</span>
    </div>
  )
}
