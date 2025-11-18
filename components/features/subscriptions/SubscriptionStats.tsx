'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import {
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  Clock,
  PieChart,
} from 'lucide-react'
import type { SubscriptionStats as Stats } from '@/lib/services/subscription-service'

interface SubscriptionStatsProps {
  stats: Stats
  currency?: string
}

export function SubscriptionStats({ stats, currency = 'USD' }: SubscriptionStatsProps) {
  return (
    <div className="space-y-4">
      {/* Overview cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActive}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalMonthly} monthly, {stats.totalYearly} yearly
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.monthlySpend, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.yearlySpend, currency)}/year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unused Subscriptions</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unusedCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.unusedCount > 0
                ? 'Consider cancelling to save money'
                : 'All subscriptions are being used'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Subscriptions</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.trialCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.trialCount > 0 ? 'Remember to cancel before billing' : 'No active trials'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      {stats.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              <CardTitle>Spend by Category</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.byCategory.map((category) => {
                const percentage = (category.monthlySpend / stats.monthlySpend) * 100

                return (
                  <div key={category.categoryId || 'uncategorized'} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{category.categoryName}</span>
                        <span className="text-muted-foreground">({category.count})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                        <span className="font-semibold min-w-[80px] text-right">
                          {formatCurrency(category.monthlySpend, currency)}/mo
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Savings opportunity */}
      {stats.unusedCount > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Potential Savings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-orange-800">
            <p>
              You have <strong>{stats.unusedCount} unused subscription{stats.unusedCount > 1 ? 's' : ''}</strong>.
              Review and cancel to potentially save money each month.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
