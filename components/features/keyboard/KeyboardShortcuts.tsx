'use client'

import { useState, useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Command, Keyboard } from 'lucide-react'

export interface KeyboardShortcutsConfig {
  onNewTransaction?: () => void
  onTransfer?: () => void
  onScanReceipt?: () => void
  onSearch?: () => void
  onToggleFilters?: () => void
  onRefresh?: () => void
  onGoToDashboard?: () => void
  onGoToTransactions?: () => void
  onGoToAccounts?: () => void
  onGoToSettings?: () => void
}

export function KeyboardShortcutsProvider({ config }: { config: KeyboardShortcutsConfig }) {
  const [showHelp, setShowHelp] = useState(false)

  // Show help dialog
  useHotkeys('shift+?', () => setShowHelp(true), { preventDefault: true })

  // Close dialog
  useHotkeys('escape', () => setShowHelp(false))

  // Navigation shortcuts
  useHotkeys('g d', () => config.onGoToDashboard?.(), { preventDefault: true })
  useHotkeys('g t', () => config.onGoToTransactions?.(), { preventDefault: true })
  useHotkeys('g a', () => config.onGoToAccounts?.(), { preventDefault: true })
  useHotkeys('g s', () => config.onGoToSettings?.(), { preventDefault: true })

  // Action shortcuts
  useHotkeys('n', () => config.onNewTransaction?.(), { preventDefault: true })
  useHotkeys('t', () => config.onTransfer?.(), { preventDefault: true })
  useHotkeys('s', () => config.onScanReceipt?.(), { preventDefault: true })
  useHotkeys('/', () => config.onSearch?.(), { preventDefault: true })
  useHotkeys('f', () => config.onToggleFilters?.(), { preventDefault: true })
  useHotkeys('r', () => config.onRefresh?.(), { preventDefault: true })

  return (
    <>
      {/* Keyboard shortcuts indicator */}
      <div className="fixed bottom-4 left-4 z-40 hidden md:block">
        <button
          onClick={() => setShowHelp(true)}
          className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground opacity-50 transition-opacity hover:opacity-100"
        >
          <Keyboard className="h-4 w-4" />
          <span>Press</span>
          <Badge variant="outline" className="font-mono text-xs">
            ?
          </Badge>
          <span>for shortcuts</span>
        </button>
      </div>

      {/* Help dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Command className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Speed up your workflow with keyboard shortcuts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Navigation */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Navigation</h3>
              <div className="space-y-2">
                <ShortcutRow keys={['G', 'D']} description="Go to Dashboard" />
                <ShortcutRow keys={['G', 'T']} description="Go to Transactions" />
                <ShortcutRow keys={['G', 'A']} description="Go to Accounts" />
                <ShortcutRow keys={['G', 'S']} description="Go to Settings" />
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Actions</h3>
              <div className="space-y-2">
                <ShortcutRow keys={['N']} description="New transaction" />
                <ShortcutRow keys={['T']} description="New transfer" />
                <ShortcutRow keys={['S']} description="Scan receipt" />
                <ShortcutRow keys={['/']} description="Focus search" />
                <ShortcutRow keys={['F']} description="Toggle filters" />
                <ShortcutRow keys={['R']} description="Refresh data" />
              </div>
            </div>

            {/* General */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">General</h3>
              <div className="space-y-2">
                <ShortcutRow keys={['?']} description="Show this help" />
                <ShortcutRow keys={['Esc']} description="Close dialogs" />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            💡 Tip: Many shortcuts work globally. Try them from any page!
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <span className="mx-1 text-muted-foreground">then</span>}
            <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-background px-2 font-mono text-xs font-semibold">
              {key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

// Hook for individual components to use keyboard shortcuts
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options?: { enabled?: boolean; preventDefault?: boolean }
) {
  useHotkeys(
    key,
    () => {
      if (options?.enabled === false) return
      callback()
    },
    {
      preventDefault: options?.preventDefault ?? true,
      enabled: options?.enabled ?? true,
    }
  )
}

// Global keyboard shortcuts setup
export function useGlobalKeyboardShortcuts() {
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      setIsSearchFocused(target.tagName === 'INPUT' && target.getAttribute('type') === 'search')
    }

    document.addEventListener('focusin', handleFocus)
    return () => document.removeEventListener('focusin', handleFocus)
  }, [])

  return {
    isSearchFocused,
    // Add more global state as needed
  }
}
