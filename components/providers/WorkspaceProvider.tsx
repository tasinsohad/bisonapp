'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface WorkspaceContextType {
  workspaceName: string
  workspaceLogo: string | null
  updateWorkspace: (name: string, logoUrl: string | null) => void
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceName: 'LeadPilot',
  workspaceLogo: null,
  updateWorkspace: () => {},
})

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaceName, setWorkspaceName] = useState('LeadPilot')
  const [workspaceLogo, setWorkspaceLogo] = useState<string | null>(null)

  useEffect(() => {
    // Fetch initial settings from our public API to get app_name and app_logo_url
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          if (data.data.app_name) {
            setWorkspaceName(data.data.app_name)
          }
          if (data.data.app_logo_url) {
            setWorkspaceLogo(data.data.app_logo_url)
          }
        }
      })
      .catch(console.error)
  }, [])

  const updateWorkspace = (name: string, logoUrl: string | null) => {
    setWorkspaceName(name || 'LeadPilot')
    setWorkspaceLogo(logoUrl)
  }

  return (
    <WorkspaceContext.Provider value={{ workspaceName, workspaceLogo, updateWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
