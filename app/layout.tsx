import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/shared/Toast'

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

import { getSettings } from '@/lib/settings'
import { WorkspaceProvider } from '@/components/providers/WorkspaceProvider'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const appName = settings.app_name || 'LeadPilot'
  const appLogoUrl = settings.app_logo_url || '/favicon.ico'

  return {
    title: appName,
    description: 'AI Sales Automation Platform',
    icons: {
      icon: appLogoUrl,
    }
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased text-slate-900 bg-[#f4f5f7]">
        <WorkspaceProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </WorkspaceProvider>
      </body>
    </html>
  )
}
