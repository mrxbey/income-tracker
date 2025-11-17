import { prisma } from '@/lib/db'
import { Period, TxnType } from '@prisma/client'

export interface BudgetWithActual {
  id: string
  categoryId: string
  categoryName: string
  categoryColor: string | null
  budgetAmount: number
  actualAmount: number
  remaining: number
  percentage: number
  currency: string
  isOverBudget: boolean
  projectedEndOfMonth: number
  daysLeftInMonth: number
}

export interface BudgetSummary {
  totalBudget: number
  totalActual: number
  totalRemaining: number
  overallPercentage: number
  categoriesCount: number
  overBudgetCount: number
  currency: string
  budgets: BudgetWithActual[]
}

/**
 * Get budget summary for the current month
 */
export async function getBudgetSummary(userId: string): Promise<BudgetSummary> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Get active budgets for current month
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      isActive: true,
      startDate: {
        lte: monthEnd,
      },
      OR: [
        { endDate: null },
        { endDate: { gte: monthStart } },
      ],
    },
    include: {
      category: true,
    },
  })

  if (budgets.length === 0) {
    return {
      totalBudget: 0,
      totalActual: 0,
      totalRemaining: 0,
      overallPercentage: 0,
      categoriesCount: 0,
      overBudgetCount: 0,
      currency: 'USD',
      budgets: [],
    }
  }

  // Get actual spending by category for current month
  const spending = await prisma.transaction.groupBy({
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
      categoryId: {
        in: budgets.map((b) => b.categoryId),
      },
    },
    _sum: {
      amount: true,
    },
  })

  // Create map of category spending
  const spendingMap: Record<string, number> = {}
  for (const s of spending) {
    if (s.categoryId) {
      spendingMap[s.categoryId] = Math.abs(Number(s._sum.amount))
    }
  }

  // Calculate days left in month
  const daysLeftInMonth = monthEnd.getDate() - now.getDate()
  const daysInMonth = monthEnd.getDate()
  const daysElapsed = now.getDate()

  // Build budget with actual data
  const budgetsWithActual: BudgetWithActual[] = budgets.map((budget) => {
    const budgetAmount = Number(budget.amount)
    const actualAmount = spendingMap[budget.categoryId] || 0
    const remaining = budgetAmount - actualAmount
    const percentage = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0

    // Project end-of-month spending based on current rate
    const dailyRate = daysElapsed > 0 ? actualAmount / daysElapsed : 0
    const projectedEndOfMonth = dailyRate * daysInMonth

    return {
      id: budget.id,
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      categoryColor: budget.category.color,
      budgetAmount,
      actualAmount,
      remaining,
      percentage,
      currency: budget.currency,
      isOverBudget: actualAmount > budgetAmount,
      projectedEndOfMonth,
      daysLeftInMonth,
    }
  })

  // Calculate totals
  const totalBudget = budgetsWithActual.reduce((sum, b) => sum + b.budgetAmount, 0)
  const totalActual = budgetsWithActual.reduce((sum, b) => sum + b.actualAmount, 0)
  const totalRemaining = totalBudget - totalActual
  const overallPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0
  const overBudgetCount = budgetsWithActual.filter((b) => b.isOverBudget).length

  return {
    totalBudget,
    totalActual,
    totalRemaining,
    overallPercentage,
    categoriesCount: budgets.length,
    overBudgetCount,
    currency: budgets[0].currency, // Assume all budgets use same currency
    budgets: budgetsWithActual.sort((a, b) => b.percentage - a.percentage), // Sort by percentage (highest first)
  }
}

/**
 * Create a new budget
 */
export async function createBudget(
  userId: string,
  data: {
    categoryId: string
    amount: number
    currency: string
    startDate: Date
    endDate?: Date | null
  }
) {
  const budget = await prisma.budget.create({
    data: {
      userId,
      categoryId: data.categoryId,
      amount: data.amount,
      currency: data.currency,
      period: Period.MONTHLY,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: true,
    },
    include: {
      category: true,
    },
  })

  return budget
}

/**
 * Update a budget
 */
export async function updateBudget(
  userId: string,
  budgetId: string,
  data: {
    amount?: number
    startDate?: Date
    endDate?: Date | null
    isActive?: boolean
  }
) {
  const budget = await prisma.budget.update({
    where: {
      id: budgetId,
      userId, // Ensure user owns this budget
    },
    data,
    include: {
      category: true,
    },
  })

  return budget
}

/**
 * Delete a budget
 */
export async function deleteBudget(userId: string, budgetId: string) {
  await prisma.budget.delete({
    where: {
      id: budgetId,
      userId, // Ensure user owns this budget
    },
  })
}

/**
 * Get all budgets for a user
 */
export async function getUserBudgets(userId: string) {
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
    },
    include: {
      category: true,
    },
    orderBy: {
      startDate: 'desc',
    },
  })

  return budgets
}

/**
 * Quick adjust budget amount (for "quick adjust" buttons)
 */
export async function quickAdjustBudget(
  userId: string,
  budgetId: string,
  adjustment: number
) {
  const budget = await prisma.budget.findUnique({
    where: {
      id: budgetId,
      userId,
    },
  })

  if (!budget) {
    throw new Error('Budget not found')
  }

  const newAmount = Math.max(0, Number(budget.amount) + adjustment)

  return updateBudget(userId, budgetId, { amount: newAmount })
}
