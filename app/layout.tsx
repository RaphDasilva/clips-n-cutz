import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { ThemeProvider, NO_FLASH_SCRIPT } from '@/components/theme-provider'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Clips N'Cutz — Salon CRM",
  description: "Salon management system for Clips N'Cutz Unisex Salon, Lagos",
  manifest: '/manifest.json',
  applicationName: "Clips N'Cutz",
  appleWebApp: {
    capable: true,
    title: "Clips N'Cutz",
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#090909',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="h-full antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <PWAInstallPrompt />
      </body>
    </html>
  )
}
