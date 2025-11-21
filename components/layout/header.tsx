'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Bell, Keyboard, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { NotificationsPanel } from '@/components/features/notifications/NotificationsPanel'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

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

interface HeaderProps {
  onMobileMenuClick?: () => void
}

export function Header({ onMobileMenuClick }: HeaderProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const title = pageTitles[pathname] || 'Dashboard'
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMobileMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowKeyboardShortcuts(true)}
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="h-5 w-5" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
              <NotificationsPanel />
            </PopoverContent>
          </Popover>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Speed up your workflow with keyboard shortcuts
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <h3 className="mb-3 font-semibold">Navigation</h3>
              <div className="space-y-2">
                <ShortcutRow keys={['G', 'D']} description="Go to Dashboard" />
                <ShortcutRow keys={['G', 'T']} description="Go to Transactions" />
                <ShortcutRow keys={['G', 'A']} description="Go to Accounts" />
                <ShortcutRow keys={['G', 'S']} description="Go to Settings" />
              </div>
            </div>
            <div>
              <h3 className="mb-3 font-semibold">Actions</h3>
              <div className="space-y-2">
                <ShortcutRow keys={['N']} description="New Transaction" />
                <ShortcutRow keys={['T']} description="Transfer" />
                <ShortcutRow keys={['S']} description="Scan Receipt" />
                <ShortcutRow keys={['/']} description="Search" />
                <ShortcutRow keys={['F']} description="Toggle Filters" />
                <ShortcutRow keys={['R']} description="Refresh" />
              </div>
            </div>
            <div>
              <h3 className="mb-3 font-semibold">General</h3>
              <div className="space-y-2">
                <ShortcutRow keys={['?']} description="Show this help" />
                <ShortcutRow keys={['Esc']} description="Close dialogs" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{description}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <Badge key={i} variant="outline" className="font-mono">
            {key}
          </Badge>
        ))}
      </div>
    </div>
  )
}
