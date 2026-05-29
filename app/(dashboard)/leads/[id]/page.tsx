'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/shared/Toast'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BisonSenderChip } from '@/components/shared/BisonSenderChip'

// Tabs
import { LeadOverview } from '@/components/leads/LeadOverview'
import { ConversationThread } from '@/components/leads/ConversationThread'
import { FollowupPanel } from '@/components/leads/FollowupPanel'
import { MeetingPanel } from '@/components/leads/MeetingPanel'
import { ActivityLog } from '@/components/leads/ActivityLog'
import { AgentDebug } from '@/components/leads/AgentDebug'

export default function LeadDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [saving, setSaving] = useState(false)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'conversation', label: 'Conversation' },
    { id: 'followups', label: 'Follow-ups' },
    { id: 'meetings', label: 'Meetings' },
    { id: 'activity', label: 'Activity Log' },
    { id: 'debug', label: 'AI Debug' },
  ]

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/leads/${id}`)
      const d = await res.json()
      
      if (d.data) setLead(d.data)
      else if (d.error) toast(d.error, 'error')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLead()
  }, [id])

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
  }

  if (!lead) {
    return <div className="p-8 text-center text-slate-500">Lead not found.</div>
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <Link href="/leads" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Leads
          </Link>
          
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">
                {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email}
              </h1>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>{lead.email}</span>
                {lead.company && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>{lead.company}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div className="flex flex-col text-right">
                <span className="text-xs text-slate-400 mb-1">Current Status</span>
                <StatusBadge status={lead.status} />
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="flex flex-col text-right">
                <span className="text-xs text-slate-400 mb-1">Bison Sender</span>
                <BisonSenderChip email={lead.bison_sender_email_address} name={lead.bison_sender_email_name} />
              </div>
            </div>
          </div>

          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto h-full">
          {activeTab === 'overview' && <LeadOverview lead={lead} setLead={setLead} fetchLead={fetchLead} />}
          {activeTab === 'conversation' && <ConversationThread lead={lead} fetchLead={fetchLead} />}
          {activeTab === 'followups' && <FollowupPanel lead={lead} fetchLead={fetchLead} />}
          {activeTab === 'meetings' && <MeetingPanel lead={lead} />}
          {activeTab === 'activity' && <ActivityLog lead={lead} />}
          {activeTab === 'debug' && <AgentDebug lead={lead} />}
        </div>
      </div>
    </div>
  )
}
