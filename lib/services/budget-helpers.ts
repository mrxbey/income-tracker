/**
 * Budget Helper Functions
 *
 * Business logic for budget calculations and status determination.
 * Extracted from components to improve testability and reusability.
 */

export type BudgetStatus = 'on-track' | 'warning' | 'exceeded' | 'not-started'

export interface BudgetProgress {
  spent: number
  budget: number
  remaining: number
  percentage: number
  status: BudgetStatus
  isOverBudget: boolean
}

/**
 * Calculate budget progress percentage
 *
 * @param spent - Amount spent
 * @param budget - Total budget amount
 * @returns Progress percentage (0-100+, capped at 200 for display)
 *
 * @example
 * ```ts
 * calculateBudgetProgress(750, 1000) // Returns 75
 * calculateBudgetProgress(1200, 1000) // Returns 120
 * ```
 */
export function calculateBudgetProgress(spent: number, budget: number): number {
  if (budget <= 0) return 0
  return Math.min((spent / budget) * 100, 200) // Cap at 200% for display
}

/**
 * Determine budget status based on progress
 *
 * @param progress - Progress percentage (0-100+)
 * @returns Budget status indicator
 *
 * Status levels:
 * - on-track: < 80%
 * - warning: 80-99%
 * - exceeded: >= 100%
 * - not-started: 0%
 */
export function getBudgetStatus(progress: number): BudgetStatus {
  if (progress === 0) return 'not-started'
  if (progress >= 100) return 'exceeded'
  if (progress >= 80) return 'warning'
  return 'on-track'
}

/**
 * Get comprehensive budget progress information
 *
 * @param spent - Amount spent
 * @param budget - Total budget amount
 * @returns Complete budget progress data
 *
 * @example
 * ```ts
 * const progress = getBudgetProgressInfo(750, 1000)
 * // {
 * //   spent: 750,
 * //   budget: 1000,
 * //   remaining: 250,
 * //   percentage: 75,
 * //   status: 'on-track',
 * //   isOverBudget: false
 * // }
 * ```
 */
export function getBudgetProgressInfo(spent: number, budget: number): BudgetProgress {
  const percentage = calculateBudgetProgress(spent, budget)
  const remaining = budget - spent
  const status = getBudgetStatus(percentage)
  const isOverBudget = spent > budget

  return {
    spent,
    budget,
    remaining,
    percentage,
    status,
    isOverBudget,
  }
}

/**
 * Get color class for budget status (Tailwind CSS)
 *
 * @param status - Budget status
 * @returns Tailwind color class
 */
export function getBudgetStatusColor(status: BudgetStatus): string {
  switch (status) {
    case 'on-track':
      return 'text-green-600'
    case 'warning':
      return 'text-yellow-600'
    case 'exceeded':
      return 'text-red-600'
    case 'not-started':
      return 'text-gray-400'
    default:
      return 'text-gray-600'
  }
}

/**
 * Get background color class for budget status
 *
 * @param status - Budget status
 * @returns Tailwind background color class
 */
export function getBudgetStatusBg(status: BudgetStatus): string {
  switch (status) {
    case 'on-track':
      return 'bg-green-100'
    case 'warning':
      return 'bg-yellow-100'
    case 'exceeded':
      return 'bg-red-100'
    case 'not-started':
      return 'bg-gray-100'
    default:
      return 'bg-gray-100'
  }
}

/**
 * Get human-readable status message
 *
 * @param status - Budget status
 * @param remaining - Remaining budget amount
 * @returns Status message
 */
export function getBudgetStatusMessage(status: BudgetStatus, remaining: number): string {
  switch (status) {
    case 'on-track':
      return `${Math.abs(remaining).toFixed(2)} remaining`
    case 'warning':
      return `${Math.abs(remaining).toFixed(2)} remaining - approaching limit`
    case 'exceeded':
      return `${Math.abs(remaining).toFixed(2)} over budget`
    case 'not-started':
      return 'No spending yet'
    default:
      return 'Unknown status'
  }
}

/**
 * Calculate days remaining in budget period
 *
 * @param periodStart - Start date of budget period
 * @param periodEnd - End date of budget period
 * @returns Days remaining (negative if period has ended)
 */
export function getDaysRemainingInPeriod(periodStart: Date, periodEnd: Date): number {
  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.ceil((periodEnd.getTime() - now.getTime()) / msPerDay)
}

/**
 * Calculate average daily spending rate
 *
 * @param spent - Total amount spent
 * @param periodStart - Start date of budget period
 * @returns Average daily spending
 */
export function getAverageDailySpending(spent: number, periodStart: Date): number {
  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  const daysSinceStart = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / msPerDay))
  return spent / daysSinceStart
}

/**
 * Project total spending for period based on current rate
 *
 * @param spent - Amount spent so far
 * @param periodStart - Start date of budget period
 * @param periodEnd - End date of budget period
 * @returns Projected total spending
 */
export function getProjectedSpending(spent: number, periodStart: Date, periodEnd: Date): number {
  const averageDaily = getAverageDailySpending(spent, periodStart)
  const msPerDay = 24 * 60 * 60 * 1000
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / msPerDay)
  return averageDaily * totalDays
}

/**
 * Determine if budget is at risk of being exceeded
 *
 * @param spent - Amount spent so far
 * @param budget - Total budget
 * @param periodStart - Start date of budget period
 * @param periodEnd - End date of budget period
 * @returns Whether budget is at risk
 */
export function isBudgetAtRisk(
  spent: number,
  budget: number,
  periodStart: Date,
  periodEnd: Date
): boolean {
  const projected = getProjectedSpending(spent, periodStart, periodEnd)
  return projected > budget * 0.95 // At risk if projected to exceed 95% of budget
}
