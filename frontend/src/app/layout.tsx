'use client'

import './globals.css'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Providers } from './providers'
import { Header } from '@/components/layout/Header'
import { Sidebar, SidebarProvider, useSidebar } from '@/components/layout/Sidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { VisualPattern } from '@/components/brand'
import { Funnel_Display, Geologica } from 'next/font/google'
import { cn } from '@/lib/utils'

// Configure Funnel Display (Primary / Headings)
const funnel = Funnel_Display({
  subsets: ['latin'],
  variable: '--font-funnel',
  display: 'swap',
})

// Configure Geologica (Secondary / Body)
const geologica = Geologica({
  subsets: ['latin'],
  variable: '--font-geologica',
  display: 'swap',
})

// Routes that should NOT show the main app shell (sidebar, header)
const AUTH_ROUTES = ['/auth/signin', '/auth/register', '/auth/error']

// Standalone routes — no sidebar, no header, full page
const STANDALONE_ROUTES = ['/', '/sales']

// Inner layout that can access sidebar context and pathname
function LayoutContent({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isCollapsed } = useSidebar()
  const pathname = usePathname()

  // Check if current route is an auth route (should be full-screen)
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname?.startsWith(route))
  const isStandalone = STANDALONE_ROUTES.includes(pathname || '')

  // Standalone routes — completely bare, no shell
  if (isStandalone) {
    return <>{children}</>
  }

  // Auth routes get a clean, full-screen layout
  if (isAuthRoute) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100'>
        <VisualPattern variant='subtle' />
        <main className='relative z-10 flex min-h-screen items-center justify-center p-4'>
          {children}
        </main>
      </div>
    )
  }

  // Normal app layout with sidebar and header
  return (
    <>
      {/* Ambient visual pattern */}
      <VisualPattern variant='subtle' />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div
        className={cn(
          'min-h-screen bg-white',
          // Offset for fixed sidebar
          isCollapsed ? 'md:pl-14' : 'md:pl-56',
          'transition-all duration-300 ease-out'
        )}
      >
        {/* Floating Header */}
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Main content with landmark role */}
        <main
          id='main-content'
          role='main'
          aria-label='Main content'
          className={cn(
            'flex flex-col',
            // Account for fixed header height
            'pt-[3.5rem]',
            // Padding
            'px-6 pb-8',
            // Min height
            'min-h-screen',
            // White background like Supervity
            'bg-white'
          )}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en' className='light' suppressHydrationWarning>
      <head>
        <title>AutoPilot Command Center</title>
        <meta name='description' content='AI Command Center — Build, govern, and monitor your AI workforce' />
      </head>
      <body
        className={cn(
          'min-h-screen font-sans antialiased',
          'bg-background text-foreground',
          funnel.variable,
          geologica.variable
        )}
      >
        <Providers>
          <SidebarProvider>
            <LayoutContent>{children}</LayoutContent>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  )
}
