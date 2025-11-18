import { db as prisma } from '@/lib/prisma'
import { detectRecurringPatterns, RecurringPattern } from '@/lib/ai/recurring-detection'
import { Period, TxnType } from '@prisma/client'
import { Decimal } from 'decimal.js'

export interface Subscription {
  id: string
  name: string
  merchant: string
  amount: number
  currency: string
  frequency: Period
  nextBillingDate: Date
  lastBillingDate: Date
  categoryId: string | null
  categoryName?: string
  status: 'active' | 'inactive' | 'cancelled' | 'trial'
  occurrences: number
  confidence: number
  isManual: boolean
  createdAt: Date
  updatedAt: Date
  fixedExpenseId?: string | null

  // Subscription-specific metadata
  priceHistory: PriceChange[]
  lastUsedDate?: Date
  usageScore?: number // 0-100, how much the subscription is being used
  cancelUrl?: string
  renewalReminder?: boolean
  notes?: string
}

export interface PriceChange {
  date: Date
  oldAmount: number
  newAmount: number
  percentageChange: number
}

export interface SubscriptionStats {
  totalActive: number
  totalMonthly: number
  totalYearly: number
  monthlySpend: number
  yearlySpend: number
  unusedCount: number
  trialCount: number
  byCategory: Array<{
    categoryId: string | null
    categoryName: string
    count: number
    monthlySpend: number
  }>
}

export interface SubscriptionAlert {
  type: 'renewal' | 'price_increase' | 'unused' | 'trial_ending'
  subscriptionId: string
  subscriptionName: string
  message: string
  date: Date
  amount?: number
}

/**
 * Detect all subscriptions from transaction history
 */
export async function detectSubscriptions(userId: string): Promise<Subscription[]> {
  try {
    // Get recurring patterns
    const patterns = await detectRecurringPatterns(userId, 3)

    // Filter for subscriptions (expenses only, regular intervals)
    const subscriptionPatterns = patterns.filter((pattern) => {
      return (
        pattern.type === TxnType.EXPENSE &&
        (pattern.frequency === Period.MONTHLY ||
          pattern.frequency === Period.YEARLY ||
          pattern.frequency === Period.QUARTERLY) &&
        pattern.confidence >= 0.6
      )
    })

    // Get existing fixed expenses
    const fixedExpenses = await prisma.fixedExpense.findMany({
      where: { userId },
      include: { category: true },
    })

    // Get price history for each pattern
    const subscriptions: Subscription[] = await Promise.all(
      subscriptionPatterns.map(async (pattern) => {
        const priceHistory = await analyzePriceHistory(pattern.transactionIds)
        const usageScore = await calculateUsageScore(userId, pattern)

        // Check if this pattern matches an existing fixed expense
        const matchingExpense = fixedExpenses.find(
          (fe) =>
            fe.name.toLowerCase() === pattern.merchant.toLowerCase() &&
            fe.period === pattern.frequency
        )

        return {
          id: matchingExpense?.id || `detected-${pattern.merchant}`,
          name: pattern.merchant,
          merchant: pattern.merchant,
          amount: Math.abs(pattern.averageAmount),
          currency: pattern.currency,
          frequency: pattern.frequency,
          nextBillingDate: pattern.nextExpectedDate,
          lastBillingDate: pattern.lastOccurrence,
          categoryId: pattern.categoryId || null,
          categoryName: matchingExpense?.category?.name,
          status: determineStatus(pattern),
          occurrences: pattern.occurrences,
          confidence: pattern.confidence,
          isManual: !!matchingExpense,
          createdAt: matchingExpense?.createdAt || pattern.lastOccurrence,
          updatedAt: matchingExpense?.updatedAt || pattern.lastOccurrence,
          fixedExpenseId: matchingExpense?.id,
          priceHistory,
          usageScore,
          renewalReminder: matchingExpense !== undefined,
        }
      })
    )

    return subscriptions.sort((a, b) => b.amount - a.amount)
  } catch (error) {
    console.error('Error detecting subscriptions:', error)
    return []
  }
}

/**
 * Get subscription statistics
 */
export async function getSubscriptionStats(userId: string): Promise<SubscriptionStats> {
  const subscriptions = await detectSubscriptions(userId)

  const active = subscriptions.filter((s) => s.status === 'active')
  const trial = subscriptions.filter((s) => s.status === 'trial')
  const unused = subscriptions.filter((s) => (s.usageScore || 0) < 20)

  // Calculate monthly spend
  const monthlySpend = active.reduce((sum, sub) => {
    const monthlyAmount = convertToMonthly(sub.amount, sub.frequency)
    return sum + monthlyAmount
  }, 0)

  // Calculate yearly spend
  const yearlySpend = monthlySpend * 12

  // Group by category
  const byCategory = Object.values(
    active.reduce((acc: Record<string, any>, sub) => {
      const key = sub.categoryId || 'uncategorized'
      if (!acc[key]) {
        acc[key] = {
          categoryId: sub.categoryId,
          categoryName: sub.categoryName || 'Uncategorized',
          count: 0,
          monthlySpend: 0,
        }
      }
      acc[key].count++
      acc[key].monthlySpend += convertToMonthly(sub.amount, sub.frequency)
      return acc
    }, {})
  ).sort((a: any, b: any) => b.monthlySpend - a.monthlySpend)

  return {
    totalActive: active.length,
    totalMonthly: active.filter((s) => s.frequency === Period.MONTHLY).length,
    totalYearly: active.filter((s) => s.frequency === Period.YEARLY).length,
    monthlySpend,
    yearlySpend,
    unusedCount: unused.length,
    trialCount: trial.length,
    byCategory,
  }
}

/**
 * Get subscription alerts
 */
export async function getSubscriptionAlerts(userId: string): Promise<SubscriptionAlert[]> {
  const subscriptions = await detectSubscriptions(userId)
  const alerts: SubscriptionAlert[] = []
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  for (const sub of subscriptions) {
    // Renewal alerts (within 7 days)
    if (sub.nextBillingDate <= thirtyDaysFromNow && sub.renewalReminder) {
      const daysUntil = Math.ceil(
        (sub.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      alerts.push({
        type: 'renewal',
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        message: `${sub.name} renews in ${daysUntil} days`,
        date: sub.nextBillingDate,
        amount: sub.amount,
      })
    }

    // Price increase alerts
    if (sub.priceHistory.length > 0) {
      const lastChange = sub.priceHistory[sub.priceHistory.length - 1]
      if (lastChange && lastChange.percentageChange > 5) {
        const daysSinceChange = Math.ceil(
          (now.getTime() - lastChange.date.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSinceChange <= 30) {
          alerts.push({
            type: 'price_increase',
            subscriptionId: sub.id,
            subscriptionName: sub.name,
            message: `${sub.name} price increased by ${lastChange.percentageChange.toFixed(1)}%`,
            date: lastChange.date,
            amount: lastChange.newAmount,
          })
        }
      }
    }

    // Unused subscription alerts
    if ((sub.usageScore || 0) < 20 && sub.status === 'active') {
      alerts.push({
        type: 'unused',
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        message: `${sub.name} appears to be rarely used`,
        date: now,
        amount: sub.amount,
      })
    }

    // Trial ending alerts
    if (sub.status === 'trial') {
      const daysUntil = Math.ceil(
        (sub.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysUntil <= 7 && daysUntil >= 0) {
        alerts.push({
          type: 'trial_ending',
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          message: `${sub.name} trial ends in ${daysUntil} days`,
          date: sub.nextBillingDate,
          amount: sub.amount,
        })
      }
    }
  }

  return alerts.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/**
 * Convert a subscription to a fixed expense
 */
export async function convertToFixedExpense(
  userId: string,
  subscription: Subscription,
  accountId?: string
): Promise<{ success: boolean; fixedExpenseId?: string; error?: string }> {
  try {
    if (subscription.fixedExpenseId) {
      return {
        success: true,
        fixedExpenseId: subscription.fixedExpenseId,
      }
    }

    const fixedExpense = await prisma.fixedExpense.create({
      data: {
        userId,
        name: subscription.name,
        amount: new Decimal(subscription.amount),
        currency: subscription.currency,
        period: subscription.frequency,
        nextDueAt: subscription.nextBillingDate,
        accountId: accountId || null,
        categoryId: subscription.categoryId,
      },
    })

    return {
      success: true,
      fixedExpenseId: fixedExpense.id,
    }
  } catch (error) {
    console.error('Error converting to fixed expense:', error)
    return {
      success: false,
      error: 'Failed to create fixed expense',
    }
  }
}

/**
 * Mark a subscription as cancelled
 */
export async function cancelSubscription(
  userId: string,
  fixedExpenseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.fixedExpense.update({
      where: {
        id: fixedExpenseId,
        userId,
      },
      data: {
        isActive: false,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return {
      success: false,
      error: 'Failed to cancel subscription',
    }
  }
}

// Helper functions

function determineStatus(pattern: RecurringPattern): Subscription['status'] {
  const daysSinceLastOccurrence = Math.ceil(
    (new Date().getTime() - pattern.lastOccurrence.getTime()) / (1000 * 60 * 60 * 24)
  )

  // If last occurrence was more than 2 billing cycles ago, mark as cancelled
  const maxDays = pattern.frequency === Period.MONTHLY ? 60 : 365
  if (daysSinceLastOccurrence > maxDays) {
    return 'cancelled'
  }

  // Check if this looks like a trial (low occurrences, recent start)
  if (pattern.occurrences <= 2) {
    return 'trial'
  }

  return 'active'
}

async function analyzePriceHistory(transactionIds: string[]): Promise<PriceChange[]> {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
      },
      select: {
        id: true,
        amount: true,
        postedAt: true,
      },
      orderBy: {
        postedAt: 'asc',
      },
    })

    const priceChanges: PriceChange[] = []

    for (let i = 1; i < transactions.length; i++) {
      const prev = transactions[i - 1]!
      const curr = transactions[i]!

      const prevAmount = Math.abs(Number(prev.amount))
      const currAmount = Math.abs(Number(curr.amount))

      // Detect significant price changes (>2%)
      const percentageChange = ((currAmount - prevAmount) / prevAmount) * 100

      if (Math.abs(percentageChange) > 2) {
        priceChanges.push({
          date: curr.postedAt,
          oldAmount: prevAmount,
          newAmount: currAmount,
          percentageChange,
        })
      }
    }

    return priceChanges
  } catch (error) {
    console.error('Error analyzing price history:', error)
    return []
  }
}

async function calculateUsageScore(
  _userId: string,
  pattern: RecurringPattern
): Promise<number> {
  try {
    // Simple heuristic: if there are related transactions (same category, different merchant)
    // it indicates usage

    // For now, return a simple score based on consistency
    // A subscription with high confidence is likely being used
    return Math.round(pattern.confidence * 100)
  } catch (error) {
    console.error('Error calculating usage score:', error)
    return 50
  }
}

function convertToMonthly(amount: number, frequency: Period): number {
  switch (frequency) {
    case Period.WEEKLY:
      return amount * 4.33 // Average weeks per month
    case Period.MONTHLY:
      return amount
    case Period.QUARTERLY:
      return amount / 3
    case Period.YEARLY:
      return amount / 12
    default:
      return amount
  }
}
