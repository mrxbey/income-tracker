'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  RefreshCw,
  CalendarCheck,
  Building2,
  Tags,
  Upload,
  ClipboardList,
  TrendingUp,
  MessageSquare,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarNavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  disabled?: boolean
}

const navItems: SidebarNavItem[] = [
  // Main Navigation
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Accounts',
    href: '/accounts',
    icon: Wallet,
  },
  {
    title: 'Bank Connections',
    href: '/bank-connections',
    icon: Building2,
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: ArrowLeftRight,
  },
  {
    title: 'Subscriptions',
    href: '/subscriptions',
    icon: CalendarCheck,
  },

  // Additional Features
  {
    title: 'Budgets',
    href: '/budgets',
    icon: ClipboardList,
  },
  {
    title: 'Goals',
    href: '/goals',
    icon: TrendingUp,
  },
  {
    title: 'Tags',
    href: '/tags',
    icon: Tags,
  },
  {
    title: 'Imports',
    href: '/imports',
    icon: Upload,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex h-full w-64 flex-col border-r bg-background" role="complementary" aria-label="Sidebar">
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-2" aria-label="Go to dashboard">
          <Wallet className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="text-xl font-bold">Income Tracker</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          // Disabled items render as div (not clickable)
          if (item.disabled) {
            return (
              <div
                key={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                  'text-muted-foreground/50 cursor-not-allowed'
                )}
                role="button"
                aria-disabled="true"
                aria-label={`${item.title} (${item.badge})`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.title}
                {item.badge && (
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </div>
            )
          }

          // Active items render as Link
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.title}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.title}
              {item.badge && (
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Multi-region finance tracking
        </p>
      </div>
    </div>
  )
}
