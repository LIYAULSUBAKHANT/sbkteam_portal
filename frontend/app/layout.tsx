import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'Team Portal',
  description: 'Team management portal for members, projects, tasks, and performance tracking',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/portal-logo.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/portal-logo.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/portal-logo.png',
        type: 'image/png',
      },
    ],
    apple: '/portal-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="min-h-screen font-sans antialiased">
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
