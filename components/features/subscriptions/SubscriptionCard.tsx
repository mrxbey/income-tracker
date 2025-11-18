'use client'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Subscription } from '@/lib/services/subscription-service'
import { Period } from '@prisma/client'

interface SubscriptionCardProps {
  subscription: Subscription
  onManage?: (subscription: Subscription) => void
  onCancel?: (subscription: Subscription) => void
}

const frequencyLabels: Record<Period, string> = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
}

const statusIcons = {
  active: CheckCircle,
  inactive: XCircle,
  cancelled: XCircle,
  trial: Clock,
}

const statusColors = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  trial: 'bg-blue-100 text-blue-700',
}

export function SubscriptionCard({
  subscription,
  onManage,
  onCancel,
}: SubscriptionCardProps) {
  const StatusIcon = statusIcons[subscription.status]
  const daysUntilNext = Math.ceil(
    (subscription.nextBillingDate.getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  )

  const hasRecentPriceIncrease =
    subscription.priceHistory.length > 0 &&
    subscription.priceHistory[subscription.priceHistory.length - 1]!
      .percentageChange > 5

  const isUnused = (subscription.usageScore || 0) < 20

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{subscription.name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {frequencyLabels[subscription.frequency]}
              </Badge>
              <Badge className={`text-xs ${statusColors[subscription.status]}`}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {subscription.status}
              </Badge>
              {!subscription.isManual && (
                <Badge variant="secondary" className="text-xs">
                  Auto-detected
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {formatCurrency(subscription.amount, subscription.currency)}
            </div>
            <div className="text-xs text-muted-foreground">
              per {frequencyLabels[subscription.frequency]}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {/* Next billing */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Next billing</span>
          </div>
          <div className="font-medium">
            {subscription.nextBillingDate.toLocaleDateString()}
            {daysUntilNext >= 0 && daysUntilNext <= 30 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({daysUntilNext} days)
              </span>
            )}
          </div>
        </div>

        {/* Confidence */}
        {!subscription.isManual && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Detection confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${subscription.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium">
                {Math.round(subscription.confidence * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Alerts */}
        {(hasRecentPriceIncrease || isUnused) && (
          <div className="space-y-2">
            {hasRecentPriceIncrease && (
              <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                <TrendingUp className="h-4 w-4 mt-0.5" />
                <span>
                  Price increased by{' '}
                  {subscription.priceHistory[
                    subscription.priceHistory.length - 1
                  ]!.percentageChange.toFixed(1)}
                  %
                </span>
              </div>
            )}
            {isUnused && (
              <div className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>Rarely used - consider cancelling</span>
              </div>
            )}
          </div>
        )}

        {/* Category */}
        {subscription.categoryName && (
          <div className="text-sm text-muted-foreground">
            Category: {subscription.categoryName}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="text-sm">
            <div className="text-muted-foreground">Occurrences</div>
            <div className="font-medium">{subscription.occurrences}</div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">Last billed</div>
            <div className="font-medium">
              {subscription.lastBillingDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-3 border-t">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onManage?.(subscription)}
        >
          Manage
        </Button>
        {subscription.status === 'active' && (
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => onCancel?.(subscription)}
          >
            Cancel
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
