'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'
import {
  Loader2,
  TrendingUp,
  AlertCircle,
  Plus,
  Minus,
  DollarSign,
} from 'lucide-react'
import type { BudgetSummary, BudgetWithActual } from '@/lib/services/budget-service'

export function BudgetDashboard() {
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBudgetSummary()
  }, [])

  const loadBudgetSummary = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/budgets/summary')

      if (!response.ok) {
        throw new Error('Failed to load budget summary')
      }

      const data = await response.json()
      setSummary(data)
    } catch (err) {
      console.error('Error loading budget summary:', err)
      setError('Failed to load budget summary')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAdjust = async (budgetId: string, adjustment: number) => {
    try {
      // Get current budget
      const budget = summary?.budgets.find((b) => b.id === budgetId)
      if (!budget) return

      const newAmount = Math.max(0, budget.budgetAmount + adjustment)

      const response = await fetch(`/api/budgets/${budgetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: newAmount }),
      })

      if (!response.ok) {
        throw new Error('Failed to update budget')
      }

      // Reload summary
      await loadBudgetSummary()
    } catch (err) {
      console.error('Error adjusting budget:', err)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading budget data...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!summary || summary.budgets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">No Budgets Yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create budgets to track your spending goals
          </p>
          <Button className="mt-4" size="sm">
            Create Your First Budget
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Overview - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardTitle>
          <CardDescription>
            Tracking {summary.categoriesCount} {summary.categoriesCount === 1 ? 'category' : 'categories'}
            {summary.overBudgetCount > 0 && ` · ${summary.overBudgetCount} over budget`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.totalBudget, summary.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.totalActual, summary.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={`text-2xl font-bold ${summary.totalRemaining < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {formatCurrency(summary.totalRemaining, summary.currency)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{Math.round(summary.overallPercentage)}%</span>
            </div>
            <Progress value={Math.min(summary.overallPercentage, 100)} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Category Budgets */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Budget by Category</h3>
        {summary.budgets.map((budget) => (
          <BudgetCategoryCard
            key={budget.id}
            budget={budget}
            onQuickAdjust={handleQuickAdjust}
          />
        ))}
      </div>
    </div>
  )
}

interface BudgetCategoryCardProps {
  budget: BudgetWithActual
  onQuickAdjust: (budgetId: string, adjustment: number) => Promise<void>
}

function BudgetCategoryCard({ budget, onQuickAdjust }: BudgetCategoryCardProps) {
  const [adjusting, setAdjusting] = useState(false)

  const handleAdjust = async (adjustment: number) => {
    setAdjusting(true)
    try {
      await onQuickAdjust(budget.id, adjustment)
    } finally {
      setAdjusting(false)
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusBadge = () => {
    if (budget.isOverBudget) {
      return <Badge variant="destructive">Over Budget</Badge>
    }
    if (budget.percentage >= 80) {
      return <Badge variant="default" className="bg-yellow-500">Warning</Badge>
    }
    return <Badge variant="secondary" className="bg-green-500 text-white">On Track</Badge>
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{budget.categoryName}</CardTitle>
            <CardDescription className="text-xs">
              {budget.daysLeftInMonth} days remaining this month
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget vs Actual */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="font-medium">{formatCurrency(budget.budgetAmount, budget.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Actual</p>
            <p className="font-medium">{formatCurrency(budget.actualAmount, budget.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className={`font-medium ${budget.remaining < 0 ? 'text-red-500' : 'text-green-500'}`}>
              {formatCurrency(budget.remaining, budget.currency)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(budget.percentage)}%</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all ${getProgressColor(budget.percentage)}`}
              style={{ width: `${Math.min(budget.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Projection */}
        {budget.projectedEndOfMonth > budget.budgetAmount && (
          <Alert variant="destructive" className="py-2">
            <TrendingUp className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Projected to spend {formatCurrency(budget.projectedEndOfMonth, budget.currency)} by month end
              ({formatCurrency(budget.projectedEndOfMonth - budget.budgetAmount, budget.currency)} over)
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Adjust Buttons */}
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">Quick Adjust</span>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAdjust(-50)}
              disabled={adjusting || budget.budgetAmount <= 50}
            >
              <Minus className="h-3 w-3" />
              <span className="ml-1 text-xs">$50</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAdjust(50)}
              disabled={adjusting}
            >
              <Plus className="h-3 w-3" />
              <span className="ml-1 text-xs">$50</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAdjust(100)}
              disabled={adjusting}
            >
              <Plus className="h-3 w-3" />
              <span className="ml-1 text-xs">$100</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compact widget version for dashboard
 */
export function BudgetWidget() {
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBudgetSummary()
  }, [])

  const loadBudgetSummary = async () => {
    try {
      const response = await fetch('/api/budgets/summary')
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (err) {
      console.error('Error loading budget summary:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!summary || summary.budgets.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Budget This Month</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Spent</span>
          <span className="text-sm font-medium">
            {formatCurrency(summary.totalActual, summary.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Budget</span>
          <span className="text-sm font-medium">
            {formatCurrency(summary.totalBudget, summary.currency)}
          </span>
        </div>
        <Progress value={Math.min(summary.overallPercentage, 100)} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">
          {Math.round(summary.overallPercentage)}% used
        </p>
      </CardContent>
    </Card>
  )
}
