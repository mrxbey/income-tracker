'use client'

import { useState } from 'react'
import { Plus, X, Wallet, ArrowLeftRight, CreditCard, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface QuickAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  color: string
}

interface QuickAddButtonProps {
  onAddTransaction?: () => void
  onAddAccount?: () => void
  onAddTransfer?: () => void
  onScanReceipt?: () => void
}

export function QuickAddButton({
  onAddTransaction,
  onAddAccount,
  onAddTransfer,
  onScanReceipt,
}: QuickAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const actions: QuickAction[] = [
    {
      label: 'Transaction',
      icon: Wallet,
      action: () => {
        onAddTransaction?.()
        setShowActions(false)
      },
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      label: 'Transfer',
      icon: ArrowLeftRight,
      action: () => {
        onAddTransfer?.()
        setShowActions(false)
      },
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      label: 'Account',
      icon: CreditCard,
      action: () => {
        onAddAccount?.()
        setShowActions(false)
      },
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      label: 'Scan Receipt',
      icon: Receipt,
      action: () => {
        onScanReceipt?.()
        setShowActions(false)
      },
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ]

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Action Buttons (appear when FAB is clicked) */}
        {showActions && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2">
            {actions.map((action, index) => (
              <div
                key={action.label}
                className="flex items-center gap-2 animate-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="rounded-lg bg-background px-3 py-1 text-sm font-medium shadow-lg">
                  {action.label}
                </span>
                <Button
                  size="icon"
                  className={cn(
                    'h-12 w-12 rounded-full shadow-lg transition-all',
                    action.color
                  )}
                  onClick={action.action}
                >
                  <action.icon className="h-5 w-5 text-white" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <Button
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full shadow-lg transition-all',
            showActions
              ? 'rotate-45 bg-destructive hover:bg-destructive/90'
              : 'bg-primary hover:bg-primary/90'
          )}
          onClick={() => setShowActions(!showActions)}
        >
          {showActions ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Backdrop when actions are shown */}
      {showActions && (
        <div
          className="fixed inset-0 z-40 bg-black/20 animate-in fade-in"
          onClick={() => setShowActions(false)}
        />
      )}
    </>
  )
}
