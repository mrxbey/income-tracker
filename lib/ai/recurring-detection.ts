import { prisma } from '@/lib/db'
import { Period, TxnType } from '@prisma/client'

export interface RecurringPattern {
  merchant: string
  description: string
  averageAmount: number
  currency: string
  frequency: Period
  dayOfMonth?: number // For monthly recurring (e.g., 5th of every month)
  dayOfWeek?: number // For weekly recurring (0 = Sunday, 6 = Saturday)
  occurrences: number
  lastOccurrence: Date
  nextExpectedDate: Date
  confidence: number // 0-1 score
  transactionIds: string[]
  type: TxnType
  categoryId?: string | null
}

interface TransactionForAnalysis {
  id: string
  description: string
  merchant: string | null
  amount: number
  currency: string
  postedAt: Date
  type: TxnType
  categoryId: string | null
}

/**
 * Detect recurring transaction patterns from user's transaction history
 *
 * Algorithm:
 * 1. Group transactions by merchant (case-insensitive)
 * 2. For each merchant, check if transactions appear regularly
 * 3. Calculate frequency (weekly, monthly, etc.)
 * 4. Calculate day of month/week consistency
 * 5. Check amount consistency (±10% tolerance)
 * 6. Generate confidence score based on consistency
 */
export async function detectRecurringPatterns(
  userId: string,
  minOccurrences = 3 // Minimum times a transaction must appear to be considered recurring
): Promise<RecurringPattern[]> {
  try {
    // Get all transactions for the last 12 months
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const transactions = await prisma.transaction.findMany({
      where: {
        account: {
          userId,
        },
        postedAt: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        id: true,
        description: true,
        merchant: true,
        amount: true,
        currency: true,
        postedAt: true,
        type: true,
        categoryId: true,
      },
      orderBy: {
        postedAt: 'desc',
      },
    })

    // Group transactions by merchant (case-insensitive)
    const merchantGroups = groupByMerchant(transactions)

    const patterns: RecurringPattern[] = []

    // Analyze each merchant group
    for (const [merchant, txns] of Object.entries(merchantGroups)) {
      if (txns.length < minOccurrences) continue

      const pattern = analyzePattern(merchant, txns)
      if (pattern && pattern.confidence >= 0.6) {
        patterns.push(pattern)
      }
    }

    // Sort by confidence (highest first)
    return patterns.sort((a, b) => b.confidence - a.confidence)
  } catch (error) {
    console.error('Error detecting recurring patterns:', error)
    return []
  }
}

function groupByMerchant(
  transactions: TransactionForAnalysis[]
): Record<string, TransactionForAnalysis[]> {
  const groups: Record<string, TransactionForAnalysis[]> = {}

  for (const txn of transactions) {
    const key = (txn.merchant || txn.description).toLowerCase().trim()
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(txn)
  }

  return groups
}

function analyzePattern(
  merchant: string,
  transactions: TransactionForAnalysis[]
): RecurringPattern | null {
  if (transactions.length < 2) return null

  // Sort by date (oldest first)
  const sortedTxns = [...transactions].sort(
    (a, b) => a.postedAt.getTime() - b.postedAt.getTime()
  )

  // Calculate intervals between transactions (in days)
  const intervals: number[] = []
  for (let i = 1; i < sortedTxns.length; i++) {
    const daysDiff = Math.round(
      (sortedTxns[i].postedAt.getTime() - sortedTxns[i - 1].postedAt.getTime()) /
        (1000 * 60 * 60 * 24)
    )
    intervals.push(daysDiff)
  }

  // Determine frequency
  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length
  const frequency = determineFrequency(avgInterval)

  if (!frequency) return null // Not regular enough

  // Check interval consistency (standard deviation)
  const intervalStdDev = calculateStdDev(intervals)
  const intervalConsistency = 1 - Math.min(intervalStdDev / avgInterval, 1)

  // Check amount consistency
  const amounts = sortedTxns.map((txn) => Math.abs(Number(txn.amount)))
  const avgAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length
  const amountStdDev = calculateStdDev(amounts)
  const amountConsistency = 1 - Math.min(amountStdDev / avgAmount, 1)

  // Check day of month/week consistency (for monthly/weekly)
  let dayConsistency = 0
  let dayOfMonth: number | undefined
  let dayOfWeek: number | undefined

  if (frequency === Period.MONTHLY) {
    const days = sortedTxns.map((txn) => txn.postedAt.getDate())
    dayOfMonth = Math.round(days.reduce((sum, val) => sum + val, 0) / days.length)
    const dayStdDev = calculateStdDev(days)
    dayConsistency = 1 - Math.min(dayStdDev / dayOfMonth, 1)
  } else if (frequency === Period.WEEKLY) {
    const days = sortedTxns.map((txn) => txn.postedAt.getDay())
    dayOfWeek = Math.round(days.reduce((sum, val) => sum + val, 0) / days.length)
    const dayStdDev = calculateStdDev(days)
    dayConsistency = 1 - Math.min(dayStdDev / 3.5, 1) // 0-6 scale
  }

  // Calculate overall confidence
  const confidence =
    intervalConsistency * 0.4 + // 40% weight on interval consistency
    amountConsistency * 0.3 + // 30% weight on amount consistency
    dayConsistency * 0.2 + // 20% weight on day consistency
    Math.min(sortedTxns.length / 12, 1) * 0.1 // 10% weight on number of occurrences

  // Calculate next expected date
  const lastDate = sortedTxns[sortedTxns.length - 1].postedAt
  const nextExpectedDate = new Date(lastDate)

  switch (frequency) {
    case Period.WEEKLY:
      nextExpectedDate.setDate(nextExpectedDate.getDate() + 7)
      break
    case Period.MONTHLY:
      nextExpectedDate.setMonth(nextExpectedDate.getMonth() + 1)
      if (dayOfMonth) {
        nextExpectedDate.setDate(dayOfMonth)
      }
      break
    case Period.QUARTERLY:
      nextExpectedDate.setMonth(nextExpectedDate.getMonth() + 3)
      break
    case Period.YEARLY:
      nextExpectedDate.setFullYear(nextExpectedDate.getFullYear() + 1)
      break
  }

  return {
    merchant,
    description: sortedTxns[0].description,
    averageAmount: avgAmount,
    currency: sortedTxns[0].currency,
    frequency,
    dayOfMonth,
    dayOfWeek,
    occurrences: sortedTxns.length,
    lastOccurrence: lastDate,
    nextExpectedDate,
    confidence,
    transactionIds: sortedTxns.map((txn) => txn.id),
    type: sortedTxns[0].type,
    categoryId: sortedTxns[0].categoryId,
  }
}

function determineFrequency(avgIntervalDays: number): Period | null {
  // Weekly: 7 days ± 2 days tolerance
  if (avgIntervalDays >= 5 && avgIntervalDays <= 9) {
    return Period.WEEKLY
  }

  // Monthly: 30 days ± 5 days tolerance
  if (avgIntervalDays >= 25 && avgIntervalDays <= 35) {
    return Period.MONTHLY
  }

  // Quarterly: 90 days ± 10 days tolerance
  if (avgIntervalDays >= 80 && avgIntervalDays <= 100) {
    return Period.QUARTERLY
  }

  // Yearly: 365 days ± 15 days tolerance
  if (avgIntervalDays >= 350 && avgIntervalDays <= 380) {
    return Period.YEARLY
  }

  return null // Not a recognized pattern
}

function calculateStdDev(values: number[]): number {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length
  const squareDiffs = values.map((val) => Math.pow(val - avg, 2))
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length
  return Math.sqrt(avgSquareDiff)
}

/**
 * Create a FixedExpense from a detected recurring pattern
 */
export async function createFixedExpenseFromPattern(
  userId: string,
  pattern: RecurringPattern,
  accountId?: string
): Promise<{ success: boolean; fixedExpenseId?: string; error?: string }> {
  try {
    const fixedExpense = await prisma.fixedExpense.create({
      data: {
        userId,
        name: pattern.merchant,
        amount: pattern.averageAmount,
        currency: pattern.currency,
        period: pattern.frequency,
        nextDueAt: pattern.nextExpectedDate,
        accountId: accountId || null,
        categoryId: pattern.categoryId,
      },
    })

    return {
      success: true,
      fixedExpenseId: fixedExpense.id,
    }
  } catch (error) {
    console.error('Error creating fixed expense:', error)
    return {
      success: false,
      error: 'Failed to create fixed expense',
    }
  }
}
