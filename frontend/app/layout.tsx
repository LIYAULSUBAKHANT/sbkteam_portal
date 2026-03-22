import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import RealtimeProvider from '@/components/realtime-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Team Portal',
  description: 'Team management portal for members, projects, tasks, and performance tracking',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="min-h-screen font-sans antialiased">
        <RealtimeProvider>{children}</RealtimeProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
