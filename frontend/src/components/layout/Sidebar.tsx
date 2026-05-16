'use client'

import React, { createContext, useContext, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logomark } from '@/components/brand'
import { Icons } from '@/components/ui/icons'
import { Avatar } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSession } from 'next-auth/react'

// ─── Sidebar Context ──────────────────────────────────────────────────────────
interface SidebarContextType {
  isCollapsed: boolean
  setIsCollapsed: (v: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true) // collapsed by default like Supervity
  const toggle = () => setIsCollapsed(v => !v)
  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

// ─── Nav config ───────────────────────────────────────────────────────────────
interface NavItem { href: string; label: string; icon: React.ElementType; external?: boolean }
interface NavSection { title: string; items: NavItem[] }

const navSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { href: '/command-center', label: 'Dashboard', icon: Icons.dashboard },
      { href: '/workbench', label: 'Workbench',    icon: Icons.workbench },
      { href: '/',          label: 'Website',      icon: Icons.globe, external: true },
    ],
  },
  {
    title: 'AI',
    items: [
      { href: '/ai/policies', label: 'AI Policies', icon: Icons.brain },
      { href: '/ai/insights', label: 'AI Insights', icon: Icons.lightbulb },
    ],
  },
  {
    title: 'Sales',
    items: [
      { href: '/sales', label: 'Sales Portal', icon: Icons.barChart },
      { href: '/playbook', label: 'Sales Playbook', icon: Icons.bookmark },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Icons.settings },
    ],
  },
]

// ─── Nav Link ─────────────────────────────────────────────────────────────────
function NavLink({
  href,
  icon: Icon,
  label,
  isCollapsed,
  external,
}: {
  href: string
  icon: React.ElementType
  label: string
  isCollapsed: boolean
  external?: boolean
}) {
  const pathname = usePathname()
  const isActive = !external && (pathname === href || (href !== '/' && pathname?.startsWith(href)))

  const inner = external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-3 rounded-lg transition-all duration-150',
        isCollapsed ? 'h-10 w-10 justify-center' : 'h-10 px-3',
        'text-brand-navy/70 hover:bg-brand-light hover:text-brand-navy'
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
      {!isCollapsed && (
        <span className="text-sm font-medium">{label}</span>
      )}
    </a>
  ) : (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg transition-all duration-150',
        isCollapsed ? 'h-10 w-10 justify-center' : 'h-10 px-3',
        isActive
          ? 'bg-brand-navy text-white shadow-sm'
          : 'text-brand-navy/70 hover:bg-brand-light hover:text-brand-navy'
      )}
    >
      <Icon
        className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-white' : 'text-brand-navy/60')}
        strokeWidth={isActive ? 2 : 1.5}
      />
      {!isCollapsed && (
        <span className="text-sm font-medium">{label}</span>
      )}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }
  return inner
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar() {
  const { isCollapsed, toggle } = useSidebar()
  const { data: session } = useSession()

  return (
    <TooltipProvider>
      <aside
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'hidden md:flex flex-col',
          'fixed bottom-0 left-0 top-0 z-[200]',
          // Supervity sidebar: very light periwinkle
          'bg-[#F0F2FF]',
          'border-r border-[#E2E6F8]',
          'transition-all duration-300 ease-out',
          isCollapsed ? 'w-14' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex h-16 items-center border-b border-[#E2E6F8]',
          isCollapsed ? 'justify-center px-0' : 'px-4 gap-3'
        )}>
          <button
            onClick={toggle}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-white hover:bg-brand-navy-light transition-colors"
            aria-label="Toggle sidebar"
          >
            <Logomark variant="light" size={18} />
          </button>
          {!isCollapsed && (
            <div>
              <p className="font-display text-sm font-bold text-brand-navy leading-tight">AutoPilot</p>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Command Center</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 py-3 space-y-5">
          {navSections.map(section => (
            <div key={section.title}>
              {!isCollapsed && (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-brand-navy/40">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    isCollapsed={isCollapsed}
                    external={item.external}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User avatar at bottom */}
        <div className={cn(
          'border-t border-[#E2E6F8] p-2',
          isCollapsed ? 'flex justify-center' : 'flex items-center gap-3 px-3 py-3'
        )}>
          {session?.user ? (
            <>
              <Avatar
                src={session.user.image}
                fallback={session.user.name || session.user.email || '?'}
                size="sm"
                showStatus
                status="online"
              />
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-brand-navy">{session.user.name}</p>
                  <p className="truncate text-[10px] text-brand-muted">{session.user.email}</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-white text-xs font-bold">
              D
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
