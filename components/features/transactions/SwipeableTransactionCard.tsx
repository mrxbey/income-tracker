'use client'

import { useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Transaction, Account, Category, TxnType } from '@prisma/client'

interface TransactionWithRelations extends Transaction {
  account: Pick<Account, 'id' | 'name' | 'currency'>
  category: Pick<Category, 'id' | 'name'> | null
}

interface SwipeableTransactionCardProps {
  transaction: TransactionWithRelations
  onEdit?: (transaction: TransactionWithRelations) => void
  onDelete?: (id: string) => void
}

const typeIcons: Record<TxnType, React.ComponentType<{ className?: string }>> = {
  INCOME: TrendingUp,
  EXPENSE: TrendingDown,
  TRANSFER: ArrowLeftRight,
  FEE: TrendingDown,
  INTEREST: TrendingUp,
}

const typeColors: Record<TxnType, string> = {
  INCOME: 'bg-green-100 text-green-600',
  EXPENSE: 'bg-red-100 text-red-600',
  TRANSFER: 'bg-blue-100 text-blue-600',
  FEE: 'bg-orange-100 text-orange-600',
  INTEREST: 'bg-emerald-100 text-emerald-600',
}

export function SwipeableTransactionCard({
  transaction,
  onEdit,
  onDelete,
}: SwipeableTransactionCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      setIsSwiping(true)
      const offset = eventData.deltaX
      // Limit swipe to -120px (left) and 120px (right)
      const limitedOffset = Math.max(-120, Math.min(120, offset))
      setSwipeOffset(limitedOffset)
    },
    onSwiped: (eventData) => {
      setIsSwiping(false)

      // If swiped far enough, trigger action
      if (Math.abs(eventData.deltaX) > 80) {
        if (eventData.deltaX < 0) {
          // Swiped left - delete
          setTimeout(() => {
            onDelete?.(transaction.id)
          }, 200)
        } else {
          // Swiped right - edit
          setTimeout(() => {
            onEdit?.(transaction)
          }, 200)
        }
      }

      // Reset position
      setTimeout(() => {
        setSwipeOffset(0)
      }, 200)
    },
    trackMouse: false,
    trackTouch: true,
  })

  const Icon = typeIcons[transaction.type]
  const isNegative = transaction.type === 'EXPENSE' || transaction.type === 'FEE'

  // Determine background color based on swipe direction
  const getBackgroundColor = () => {
    if (swipeOffset < -40) return 'bg-red-500'
    if (swipeOffset > 40) return 'bg-blue-500'
    return 'bg-background'
  }

  return (
    <div className="relative overflow-hidden rounded-lg" {...handlers}>
      {/* Background action hints */}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-between px-6 transition-colors',
          getBackgroundColor()
        )}
      >
        {/* Edit hint (left) */}
        <div
          className={cn(
            'flex items-center gap-2 text-white transition-opacity',
            swipeOffset > 40 ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Edit className="h-5 w-5" />
          <span className="font-medium">Edit</span>
        </div>

        {/* Delete hint (right) */}
        <div
          className={cn(
            'flex items-center gap-2 text-white transition-opacity',
            swipeOffset < -40 ? 'opacity-100' : 'opacity-0'
          )}
        >
          <span className="font-medium">Delete</span>
          <Trash2 className="h-5 w-5" />
        </div>
      </div>

      {/* Card content (swipeable) */}
      <Card
        className={cn(
          'transition-transform',
          isSwiping ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            {/* Type icon */}
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', typeColors[transaction.type])}>
              <Icon className="h-5 w-5" />
            </div>

            {/* Transaction details */}
            <div>
              <div className="font-medium">{transaction.description}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {transaction.merchant && (
                  <>
                    <span>{transaction.merchant}</span>
                    <span>•</span>
                  </>
                )}
                <span>{transaction.account.name}</span>
                <span>•</span>
                <span>{formatDate(transaction.postedAt)}</span>
                {transaction.category && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      {transaction.category.name}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Amount */}
          <div
            className={cn(
              'text-lg font-semibold',
              isNegative ? 'text-red-600' : 'text-green-600'
            )}
          >
            {isNegative ? '-' : '+'}
            {formatCurrency(Math.abs(Number(transaction.amount)), transaction.currency)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Swipe instructions component (show on first use)
export function SwipeInstructions() {
  return (
    <div className="rounded-lg border-2 border-dashed border-muted bg-muted/50 p-4">
      <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Edit className="h-4 w-4" />
          </div>
          <span>Swipe right to edit</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Swipe left to delete</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Trash2 className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  )
}
