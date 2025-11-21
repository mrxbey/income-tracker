'use client'

import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/accounts': 'Accounts',
  '/budgets': 'Budgets',
  '/goals': 'Goals',
  '/tags': 'Tag Rules',
  '/subscriptions': 'Subscriptions',
  '/bank-connections': 'Bank Connections',
  '/imports': 'Import Data',
  '/settings': 'Settings',
}

export function Header() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || 'Dashboard'

  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  )
}
