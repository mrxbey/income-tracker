import { describe, it, expect } from 'vitest'
import {
  calculateBudgetProgress,
  getBudgetStatus,
  getBudgetProgressInfo,
  getBudgetStatusColor,
  getDaysRemainingInPeriod,
  getAverageDailySpending,
  getProjectedSpending,
  isBudgetAtRisk,
  type BudgetStatus,
} from '@/lib/services/budget-helpers'

describe('budget-helpers', () => {
  describe('calculateBudgetProgress', () => {
    it('should calculate correct percentage for normal spending', () => {
      expect(calculateBudgetProgress(50, 100)).toBe(50)
      expect(calculateBudgetProgress(75, 100)).toBe(75)
      expect(calculateBudgetProgress(25, 100)).toBe(25)
    })

    it('should handle zero budget', () => {
      expect(calculateBudgetProgress(50, 0)).toBe(0)
    })

    it('should cap at 200% for overspending', () => {
      expect(calculateBudgetProgress(300, 100)).toBe(200)
    })

    it('should calculate over 100% when exceeding budget', () => {
      expect(calculateBudgetProgress(150, 100)).toBe(150)
    })
  })

  describe('getBudgetStatus', () => {
    it('should return "not-started" for 0% progress', () => {
      expect(getBudgetStatus(0)).toBe('not-started')
    })

    it('should return "on-track" for progress < 80%', () => {
      expect(getBudgetStatus(50)).toBe('on-track')
      expect(getBudgetStatus(79)).toBe('on-track')
    })

    it('should return "warning" for progress 80-99%', () => {
      expect(getBudgetStatus(80)).toBe('warning')
      expect(getBudgetStatus(95)).toBe('warning')
      expect(getBudgetStatus(99)).toBe('warning')
    })

    it('should return "exceeded" for progress >= 100%', () => {
      expect(getBudgetStatus(100)).toBe('exceeded')
      expect(getBudgetStatus(150)).toBe('exceeded')
    })
  })

  describe('getBudgetProgressInfo', () => {
    it('should return comprehensive budget info', () => {
      const info = getBudgetProgressInfo(75, 100)

      expect(info.spent).toBe(75)
      expect(info.budget).toBe(100)
      expect(info.remaining).toBe(25)
      expect(info.percentage).toBe(75)
      expect(info.status).toBe('on-track')
      expect(info.isOverBudget).toBe(false)
    })

    it('should detect over-budget situations', () => {
      const info = getBudgetProgressInfo(120, 100)

      expect(info.spent).toBe(120)
      expect(info.budget).toBe(100)
      expect(info.remaining).toBe(-20)
      expect(info.percentage).toBe(120)
      expect(info.status).toBe('exceeded')
      expect(info.isOverBudget).toBe(true)
    })

    it('should handle zero budget', () => {
      const info = getBudgetProgressInfo(50, 0)

      expect(info.percentage).toBe(0)
      expect(info.status).toBe('not-started')
    })
  })

  describe('getBudgetStatusColor', () => {
    it('should return correct colors for each status', () => {
      const statusColors: Record<BudgetStatus, string> = {
        'not-started': 'text-gray-500',
        'on-track': 'text-green-600',
        'warning': 'text-amber-600',
        'exceeded': 'text-red-600',
      }

      Object.entries(statusColors).forEach(([status, expectedColor]) => {
        expect(getBudgetStatusColor(status as BudgetStatus)).toBe(expectedColor)
      })
    })
  })

  describe('getDaysRemainingInPeriod', () => {
    it('should calculate days remaining correctly', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-31')

      const days = getDaysRemainingInPeriod(start, end)

      expect(days).toBeGreaterThanOrEqual(0)
    })

    it('should return 0 for past periods', () => {
      const start = new Date('2020-01-01')
      const end = new Date('2020-01-31')

      const days = getDaysRemainingInPeriod(start, end)

      expect(days).toBe(0)
    })

    it('should handle future periods', () => {
      const start = new Date()
      const end = new Date()
      end.setDate(end.getDate() + 30)

      const days = getDaysRemainingInPeriod(start, end)

      expect(days).toBeGreaterThan(0)
      expect(days).toBeLessThanOrEqual(30)
    })
  })

  describe('getAverageDailySpending', () => {
    it('should calculate average daily spending', () => {
      const start = new Date()
      start.setDate(start.getDate() - 10) // 10 days ago

      const avg = getAverageDailySpending(100, start)

      expect(avg).toBeGreaterThan(0)
      expect(avg).toBeLessThanOrEqual(100)
    })

    it('should handle zero spending', () => {
      const start = new Date()
      start.setDate(start.getDate() - 10)

      const avg = getAverageDailySpending(0, start)

      expect(avg).toBe(0)
    })

    it('should handle same-day calculations', () => {
      const start = new Date()

      const avg = getAverageDailySpending(100, start)

      // On same day, average should equal total spent
      expect(avg).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getProjectedSpending', () => {
    it('should project spending based on current rate', () => {
      const start = new Date()
      start.setDate(start.getDate() - 10) // 10 days into period

      const end = new Date()
      end.setDate(end.getDate() + 20) // 20 days remaining

      const projected = getProjectedSpending(100, start, end)

      expect(projected).toBeGreaterThan(100) // Should project higher
    })

    it('should handle zero spending', () => {
      const start = new Date()
      start.setDate(start.getDate() - 10)

      const end = new Date()
      end.setDate(end.getDate() + 20)

      const projected = getProjectedSpending(0, start, end)

      expect(projected).toBe(0)
    })
  })

  describe('isBudgetAtRisk', () => {
    it('should detect at-risk budgets', () => {
      const start = new Date()
      start.setDate(start.getDate() - 10) // 10 days into period

      const end = new Date()
      end.setDate(end.getDate() + 20) // 20 days remaining

      // Spent 80 out of 100 in 10 days, will exceed budget
      const atRisk = isBudgetAtRisk(80, 100, start, end)

      expect(atRisk).toBe(true)
    })

    it('should not flag on-track budgets as at-risk', () => {
      const start = new Date()
      start.setDate(start.getDate() - 10) // 10 days into period

      const end = new Date()
      end.setDate(end.getDate() + 20) // 20 days remaining

      // Spent 30 out of 100 in 10 days, on track
      const atRisk = isBudgetAtRisk(30, 100, start, end)

      expect(atRisk).toBe(false)
    })

    it('should handle zero budget', () => {
      const start = new Date()
      start.setDate(start.getDate() - 10)

      const end = new Date()
      end.setDate(end.getDate() + 20)

      const atRisk = isBudgetAtRisk(50, 0, start, end)

      expect(atRisk).toBe(false)
    })

    it('should detect already exceeded budgets', () => {
      const start = new Date()
      start.setDate(start.getDate() - 10)

      const end = new Date()
      end.setDate(end.getDate() + 20)

      const atRisk = isBudgetAtRisk(120, 100, start, end)

      expect(atRisk).toBe(true)
    })
  })
})
