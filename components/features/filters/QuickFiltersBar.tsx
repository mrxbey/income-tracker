'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, TrendingDown, TrendingUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TxnType } from '@prisma/client'

export interface TransactionFilters {
  dateRange: 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'
  type: TxnType | 'ALL'
  customDateFrom?: Date
  customDateTo?: Date
}

interface QuickFiltersBarProps {
  onFilterChange: (filters: TransactionFilters) => void
  activeFilters: TransactionFilters
  filterCount?: number
}

export function QuickFiltersBar({ onFilterChange, activeFilters, filterCount = 0 }: QuickFiltersBarProps) {
  const [showCustomDate, setShowCustomDate] = useState(false)

  const dateRangeOptions = [
    { value: 'today' as const, label: 'Today' },
    { value: 'week' as const, label: 'This Week' },
    { value: 'month' as const, label: 'This Month' },
    { value: 'year' as const, label: 'This Year' },
    { value: 'all' as const, label: 'All Time' },
  ]

  const typeOptions = [
    { value: 'ALL' as const, label: 'All', icon: null },
    { value: 'INCOME' as const, label: 'Income', icon: TrendingUp },
    { value: 'EXPENSE' as const, label: 'Expense', icon: TrendingDown },
  ]

  const handleDateRangeChange = (range: TransactionFilters['dateRange']) => {
    if (range === 'custom') {
      setShowCustomDate(true)
    } else {
      setShowCustomDate(false)
      onFilterChange({ ...activeFilters, dateRange: range })
    }
  }

  const handleTypeChange = (type: TransactionFilters['type']) => {
    onFilterChange({ ...activeFilters, type })
  }

  const clearFilters = () => {
    onFilterChange({
      dateRange: 'month',
      type: 'ALL',
    })
    setShowCustomDate(false)
  }

  const hasActiveFilters = activeFilters.dateRange !== 'month' || activeFilters.type !== 'ALL'

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      {/* Date Range Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Date Range</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {dateRangeOptions.map((option) => (
            <Button
              key={option.value}
              variant={activeFilters.dateRange === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDateRangeChange(option.value)}
              className={cn(
                'transition-all',
                activeFilters.dateRange === option.value && 'shadow-md'
              )}
            >
              {option.label}
            </Button>
          ))}
          <Button
            variant={activeFilters.dateRange === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleDateRangeChange('custom')}
          >
            Custom
          </Button>
        </div>

        {/* Custom Date Range Inputs */}
        {showCustomDate && (
          <div className="flex gap-2 rounded-md border p-2 animate-in slide-in-from-top-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">From</label>
              <input
                type="date"
                className="w-full rounded border px-2 py-1 text-sm"
                onChange={(e) =>
                  onFilterChange({
                    ...activeFilters,
                    dateRange: 'custom',
                    customDateFrom: new Date(e.target.value),
                  })
                }
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">To</label>
              <input
                type="date"
                className="w-full rounded border px-2 py-1 text-sm"
                onChange={(e) =>
                  onFilterChange({
                    ...activeFilters,
                    dateRange: 'custom',
                    customDateTo: new Date(e.target.value),
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Type Filters */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Transaction Type</span>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((option) => {
            const Icon = option.icon
            return (
              <Button
                key={option.value}
                variant={activeFilters.type === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTypeChange(option.value)}
                className={cn(
                  'transition-all',
                  activeFilters.type === option.value && 'shadow-md'
                )}
              >
                {Icon && <Icon className="mr-2 h-3 w-3" />}
                {option.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            <Badge variant="secondary">{filterCount || 0} results</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}

// Helper function to convert filter to date range
export function getDateRangeFromFilter(filter: TransactionFilters['dateRange']): {
  from: Date
  to: Date
} {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (filter) {
    case 'today':
      return {
        from: today,
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      }
    case 'week': {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      return {
        from: weekStart,
        to: now,
      }
    }
    case 'month':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: now,
      }
    case 'year':
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: now,
      }
    case 'all':
      return {
        from: new Date(2000, 0, 1),
        to: now,
      }
    default:
      return { from: today, to: now }
  }
}
