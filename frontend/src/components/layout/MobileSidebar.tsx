'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logomark } from '@/components/brand'
import { Icons } from '@/components/ui/icons'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

// Navigation items configuration
const navItems = [
  {
    title: 'Platform',
    items: [
      { href: '/command-center', label: 'Dashboard', icon: Icons.dashboard, external: false },
      { href: '/workbench', label: 'Workbench', icon: Icons.workbench, external: false },
      { href: '/', label: 'Website', icon: Icons.globe, external: true },
      { href: '/sales', label: 'Sales Portal', icon: Icons.barChart, external: false },
      { href: '/playbook', label: 'Sales Playbook', icon: Icons.bookmark, external: false },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Icons.settings, external: false },
    ],
  },
]

interface NavLinkProps {
  href: string
  icon: React.ElementType
  children: React.ReactNode
  onClick?: () => void
  external?: boolean
}

function NavLink({ href, icon: Icon, children, onClick, external }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = !external && pathname === href

  const className = cn(
    'flex items-center gap-3 rounded-xl px-4 py-3',
    'text-base font-medium transition-all duration-200',
    isActive
      ? 'bg-brand-navy text-white'
      : 'text-brand-navy/70 hover:bg-brand-light hover:text-brand-navy'
  )

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={className}
      >
        <Icon strokeWidth={1.5} className="h-5 w-5 shrink-0 text-brand-navy/60" />
        <span>{children}</span>
      </a>
    )
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={className}
    >
      <Icon
        strokeWidth={1.5}
        className={cn(
          'h-5 w-5 shrink-0',
          isActive ? 'text-white' : 'text-brand-navy/60'
        )}
      />
      <span>{children}</span>
    </Link>
  )
}

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side='left' className='w-72 p-0 md:hidden'>
        {/* Header */}
        <SheetHeader className='flex h-20 flex-row items-center justify-between border-b border-black/[0.04] px-4'>
          <Link
            href='/'
            className='flex items-center gap-3'
            onClick={onClose}
          >
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-brand-navy shadow-soft'>
              <Logomark variant='light' size={24} />
            </div>
            <div className='flex flex-col'>
              <SheetTitle className='font-display text-lg font-bold tracking-tight text-brand-navy'>
                AutoPilot
              </SheetTitle>
              <span className='text-[10px] font-medium uppercase tracking-widest text-brand-navy/50'>
                Command Center
              </span>
            </div>
          </Link>
        </SheetHeader>

        {/* Navigation */}
        <nav
          className='flex-1 overflow-y-auto p-4'
          aria-label='Mobile navigation'
        >
          {navItems.map((section, sectionIndex) => (
            <div
              key={section.title}
              className={cn(sectionIndex > 0 && 'mt-6')}
            >
              <p className='mb-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-brand-navy/40'>
                {section.title}
              </p>
              <div className='space-y-1'>
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    onClick={onClose}
                    external={item.external}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

