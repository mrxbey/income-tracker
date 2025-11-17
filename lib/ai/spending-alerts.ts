import { db as prisma } from '@/lib/prisma'
import { TxnType } from '@prisma/client'

export enum AlertType {
  OVERSPENDING = 'OVERSPENDING',
  UNUSUAL_TRANSACTION = 'UNUSUAL_TRANSACTION',
  NO_INCOME = 'NO_INCOME',
  BILL_DUE = 'BILL_DUE',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface SpendingAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  amount?: number
  currency?: string
  categoryId?: string | null
  categoryName?: string
  actionable: boolean
  actionText?: string
  actionUrl?: string
  createdAt: Date
  metadata?: Record<string, unknown>
}

/**
 * Generate spending alerts for a user
 */
export async function generateSpendingAlerts(userId: string): Promise<SpendingAlert[]> {
  const alerts: SpendingAlert[] = []

  // Run all alert checks in parallel
  const [overspendingAlerts, unusualTxnAlerts, noIncomeAlerts, billDueAlerts] = await Promise.all([
    checkOverspending(userId),
    checkUnusualTransactions(userId),
    checkNoIncome(userId),
    checkBillsDue(userId),
  ])

  alerts.push(...overspendingAlerts)
  alerts.push(...unusualTxnAlerts)
  alerts.push(...noIncomeAlerts)
  alerts.push(...billDueAlerts)

  return alerts.sort((a, b) => {
    // Sort by severity (CRITICAL > WARNING > INFO)
    const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

/**
 * Check for overspending in categories this month
 */
async function checkOverspending(userId: string): Promise<SpendingAlert[]> {
  const alerts: SpendingAlert[] = []

  try {
    // Get current month start and end
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get spending by category for current month
    const currentMonthSpending = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        account: {
          userId,
        },
        type: TxnType.EXPENSE,
        postedAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    })

    // Get average monthly spending by category (last 3 months)
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

    const historicalSpending = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        account: {
          userId,
        },
        type: TxnType.EXPENSE,
        postedAt: {
          gte: threeMonthsAgo,
          lt: monthStart,
        },
      },
      _sum: {
        amount: true,
      },
    })

    // Calculate average historical spending per category
    const avgSpending: Record<string, number> = {}
    for (const cat of historicalSpending) {
      if (cat.categoryId) {
        avgSpending[cat.categoryId] = Math.abs(Number(cat._sum.amount)) / 3
      }
    }

    // Check each category for overspending
    for (const cat of currentMonthSpending) {
      if (!cat.categoryId) continue

      const currentSpend = Math.abs(Number(cat._sum.amount))
      const avgHistorical = avgSpending[cat.categoryId] || 0

      // Alert if spending 50% more than average
      if (avgHistorical > 0 && currentSpend > avgHistorical * 1.5) {
        const category = await prisma.category.findUnique({
          where: { id: cat.categoryId },
        })

        const overspendAmount = currentSpend - avgHistorical
        const daysLeft = monthEnd.getDate() - now.getDate()

        alerts.push({
          id: `overspend-${cat.categoryId}`,
          type: AlertType.OVERSPENDING,
          severity: AlertSeverity.WARNING,
          title: 'Overspending Alert',
          message: `You're on track to overspend $${overspendAmount.toFixed(2)} in ${category?.name || 'this category'} this month (${daysLeft} days left)`,
          amount: overspendAmount,
          currency: 'USD',
          categoryId: cat.categoryId,
          categoryName: category?.name,
          actionable: true,
          actionText: 'View Category',
          actionUrl: `/transactions?category=${cat.categoryId}`,
          createdAt: new Date(),
          metadata: {
            currentSpend,
            avgHistorical,
            daysLeft,
          },
        })
      }
    }
  } catch (error) {
    console.error('Error checking overspending:', error)
  }

  return alerts
}

/**
 * Check for unusual transactions (amount significantly higher than average)
 */
async function checkUnusualTransactions(userId: string): Promise<SpendingAlert[]> {
  const alerts: SpendingAlert[] = []

  try {
    // Get transactions from last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        account: {
          userId,
        },
        type: TxnType.EXPENSE,
        postedAt: {
          gte: sevenDaysAgo,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        postedAt: 'desc',
      },
    })

    // Get average spending per category (last 3 months)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    for (const txn of recentTransactions) {
      if (!txn.categoryId) continue

      // Get average for this category
      const categoryAvg = await prisma.transaction.aggregate({
        where: {
          account: {
            userId,
          },
          type: TxnType.EXPENSE,
          categoryId: txn.categoryId,
          postedAt: {
            gte: threeMonthsAgo,
            lt: sevenDaysAgo,
          },
        },
        _avg: {
          amount: true,
        },
      })

      const avgAmount = Math.abs(Number(categoryAvg._avg.amount)) || 0
      const txnAmount = Math.abs(Number(txn.amount))

      // Alert if transaction is 3x the average
      if (avgAmount > 0 && txnAmount > avgAmount * 3) {
        alerts.push({
          id: `unusual-${txn.id}`,
          type: AlertType.UNUSUAL_TRANSACTION,
          severity: AlertSeverity.INFO,
          title: 'Unusual Transaction Detected',
          message: `${txn.merchant || txn.description} - $${txnAmount.toFixed(2)} (your average is $${avgAmount.toFixed(2)})`,
          amount: txnAmount,
          currency: txn.currency,
          categoryId: txn.categoryId,
          categoryName: txn.category?.name,
          actionable: true,
          actionText: 'View Transaction',
          actionUrl: `/transactions/${txn.id}`,
          createdAt: new Date(),
          metadata: {
            txnAmount,
            avgAmount,
            merchant: txn.merchant,
          },
        })
      }
    }
  } catch (error) {
    console.error('Error checking unusual transactions:', error)
  }

  return alerts.slice(0, 3) // Limit to 3 most recent
}

/**
 * Check if no income has been recorded recently
 */
async function checkNoIncome(userId: string): Promise<SpendingAlert[]> {
  const alerts: SpendingAlert[] = []

  try {
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    const incomeCount = await prisma.transaction.count({
      where: {
        account: {
          userId,
        },
        type: TxnType.INCOME,
        postedAt: {
          gte: twoWeeksAgo,
        },
      },
    })

    if (incomeCount === 0) {
      alerts.push({
        id: 'no-income',
        type: AlertType.NO_INCOME,
        severity: AlertSeverity.WARNING,
        title: 'No Income Recorded',
        message: "You haven't recorded any income in the last 2 weeks. Is everything okay?",
        actionable: true,
        actionText: 'Add Income',
        actionUrl: '/transactions/new?type=INCOME',
        createdAt: new Date(),
      })
    }
  } catch (error) {
    console.error('Error checking no income:', error)
  }

  return alerts
}

/**
 * Check for upcoming bills due
 */
async function checkBillsDue(userId: string): Promise<SpendingAlert[]> {
  const alerts: SpendingAlert[] = []

  try {
    const now = new Date()
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const upcomingBills = await prisma.fixedExpense.findMany({
      where: {
        userId,
        nextDueAt: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
      include: {
        category: true,
      },
    })

    for (const bill of upcomingBills) {
      const daysUntilDue = Math.ceil(
        (bill.nextDueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      alerts.push({
        id: `bill-${bill.id}`,
        type: AlertType.BILL_DUE,
        severity: daysUntilDue <= 1 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        title: 'Bill Due Soon',
        message: `${bill.name} - $${Number(bill.amount).toFixed(2)} due in ${daysUntilDue} ${daysUntilDue === 1 ? 'day' : 'days'}`,
        amount: Number(bill.amount),
        currency: bill.currency,
        categoryId: bill.categoryId,
        categoryName: bill.category?.name,
        actionable: true,
        actionText: 'View Fixed Expenses',
        actionUrl: '/fixed-expenses',
        createdAt: new Date(),
        metadata: {
          daysUntilDue,
          billName: bill.name,
        },
      })
    }
  } catch (error) {
    console.error('Error checking bills due:', error)
  }

  return alerts
}
