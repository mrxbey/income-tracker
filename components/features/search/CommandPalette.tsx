'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  CreditCard,
  TrendingUp,
  Calendar,
  Tag,
  Settings,
  FileBarChart,
  Receipt,
  Target,
  PiggyBank,
  Search,
} from 'lucide-react'

interface SearchItem {
  id: string
  title: string
  subtitle?: string
  type: 'navigation' | 'transaction' | 'account'
  icon: any
  action: () => void
  keywords?: string[]
}

interface CommandPaletteProps {
  onClose: () => void
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Navigation items
  const navigationItems: SearchItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'Overview of your finances',
      type: 'navigation',
      icon: Home,
      action: () => router.push('/'),
      keywords: ['home', 'overview', 'dashboard'],
    },
    {
      id: 'nav-transactions',
      title: 'Transactions',
      subtitle: 'View all transactions',
      type: 'navigation',
      icon: Receipt,
      action: () => router.push('/transactions'),
      keywords: ['transactions', 'payments', 'history'],
    },
    {
      id: 'nav-accounts',
      title: 'Accounts',
      subtitle: 'Manage your accounts',
      type: 'navigation',
      icon: CreditCard,
      action: () => router.push('/accounts'),
      keywords: ['accounts', 'bank', 'credit card'],
    },
    {
      id: 'nav-budgets',
      title: 'Budgets',
      subtitle: 'Track your spending',
      type: 'navigation',
      icon: PiggyBank,
      action: () => router.push('/budgets'),
      keywords: ['budgets', 'spending', 'limits'],
    },
    {
      id: 'nav-goals',
      title: 'Goals',
      subtitle: 'Financial goals',
      type: 'navigation',
      icon: Target,
      action: () => router.push('/goals'),
      keywords: ['goals', 'savings', 'targets'],
    },
    {
      id: 'nav-subscriptions',
      title: 'Subscriptions',
      subtitle: 'Recurring expenses',
      type: 'navigation',
      icon: Calendar,
      action: () => router.push('/subscriptions'),
      keywords: ['subscriptions', 'recurring', 'bills'],
    },
    {
      id: 'nav-tags',
      title: 'Tags',
      subtitle: 'Tag rules',
      type: 'navigation',
      icon: Tag,
      action: () => router.push('/tags'),
      keywords: ['tags', 'rules', 'categories'],
    },
    {
      id: 'nav-analytics',
      title: 'Analytics',
      subtitle: 'Financial insights',
      type: 'navigation',
      icon: TrendingUp,
      action: () => router.push('/analytics'),
      keywords: ['analytics', 'insights', 'reports', 'charts'],
    },
    {
      id: 'nav-reports',
      title: 'Reports',
      subtitle: 'Generate reports',
      type: 'navigation',
      icon: FileBarChart,
      action: () => router.push('/reports'),
      keywords: ['reports', 'export', 'statements'],
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      subtitle: 'App settings',
      type: 'navigation',
      icon: Settings,
      action: () => router.push('/settings'),
      keywords: ['settings', 'preferences', 'config'],
    },
  ]

  // Filter items based on search query
  const filteredItems = query
    ? navigationItems.filter((item) => {
        const searchText = query.toLowerCase()
        const matchesTitle = item.title.toLowerCase().includes(searchText)
        const matchesSubtitle = item.subtitle?.toLowerCase().includes(searchText)
        const matchesKeywords = item.keywords?.some((keyword) =>
          keyword.toLowerCase().includes(searchText)
        )
        return matchesTitle || matchesSubtitle || matchesKeywords
      })
    : navigationItems

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex]!.action()
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [filteredItems, selectedIndex, onClose]
  )

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Search Input */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search or jump to..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9"
            autoFocus
          />
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No results found for "{query}"</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Navigation Section */}
            {filteredItems.some((item) => item.type === 'navigation') && (
              <div>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Navigation
                </div>
                {filteredItems
                  .filter((item) => item.type === 'navigation')
                  .map((item, index) => {
                    const Icon = item.icon
                    const actualIndex = filteredItems.findIndex((i) => i.id === item.id)
                    const isSelected = actualIndex === selectedIndex

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => {
                          item.action()
                          onClose()
                        }}
                        onMouseEnter={() => setSelectedIndex(actualIndex)}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          {item.subtitle && (
                            <div
                              className={`text-xs truncate ${
                                isSelected
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with keyboard hints */}
      <div className="border-t p-3 bg-muted/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border bg-background">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded border bg-background">↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border bg-background">Enter</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border bg-background">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
