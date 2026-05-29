import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/shared/Toast'

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'LeadPilot',
  description: 'AI Sales Automation Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased text-slate-900 bg-[#f4f5f7]">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
