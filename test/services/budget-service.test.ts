import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateBudgetProgress, getBudgetSummary } from '@/lib/services/budget-service'
import { db as prisma } from '@/lib/prisma'
import { TxnType } from '@prisma/client'
import Decimal from 'decimal.js'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  db: {
    budget: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    transaction: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

describe('Budget Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateBudgetProgress', () => {
    it('should calculate budget progress correctly', () => {
      const result = calculateBudgetProgress(100, 75)

      expect(result.percentage).toBe(75)
      expect(result.remaining).toBe(25)
      expect(result.status).toBe('on-track')
    })

    it('should mark budget as over when exceeding limit', () => {
      const result = calculateBudgetProgress(100, 120)

      expect(result.percentage).toBe(120)
      expect(result.remaining).toBe(-20)
      expect(result.status).toBe('over')
    })

    it('should mark budget as warning when near limit', () => {
      const result = calculateBudgetProgress(100, 85)

      expect(result.percentage).toBe(85)
      expect(result.status).toBe('warning')
    })

    it('should handle zero budget amount', () => {
      const result = calculateBudgetProgress(0, 50)

      expect(result.percentage).toBe(Infinity)
      expect(result.status).toBe('over')
    })
  })

  describe('getBudgetSummary', () => {
    it('should return budget summary with spending data', async () => {
      const mockBudgets = [
        {
          id: 'budget-1',
          userId: 'user-1',
          categoryId: 'cat-1',
          amount: new Decimal(1000),
          currency: 'USD',
          period: 'MONTHLY',
          startDate: new Date('2025-01-01'),
          endDate: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 'cat-1',
            name: 'Groceries',
            userId: 'user-1',
            type: TxnType.EXPENSE,
            parentId: null,
            icon: '🛒',
            color: '#4CAF50',
            createdAt: new Date(),
          },
        },
      ]

      const mockSpending = [
        {
          categoryId: 'cat-1',
          _sum: { amount: new Decimal(-750) },
        },
      ]

      vi.mocked(prisma.budget.findMany).mockResolvedValue(mockBudgets as any)
      vi.mocked(prisma.transaction.groupBy).mockResolvedValue(mockSpending as any)

      const result = await getBudgetSummary('user-1', new Date('2025-01-01'), new Date('2025-01-31'))

      expect(result).toHaveLength(1)
      expect(result[0].budget.id).toBe('budget-1')
      expect(result[0].spent).toBe(750)
      expect(result[0].progress.percentage).toBe(75)
      expect(result[0].progress.status).toBe('on-track')
    })

    it('should handle budgets with no spending', async () => {
      const mockBudgets = [
        {
          id: 'budget-1',
          userId: 'user-1',
          categoryId: 'cat-1',
          amount: new Decimal(1000),
          currency: 'USD',
          period: 'MONTHLY',
          startDate: new Date('2025-01-01'),
          endDate: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 'cat-1',
            name: 'Groceries',
            userId: 'user-1',
            type: TxnType.EXPENSE,
            parentId: null,
            icon: null,
            color: null,
            createdAt: new Date(),
          },
        },
      ]

      vi.mocked(prisma.budget.findMany).mockResolvedValue(mockBudgets as any)
      vi.mocked(prisma.transaction.groupBy).mockResolvedValue([])

      const result = await getBudgetSummary('user-1', new Date('2025-01-01'), new Date('2025-01-31'))

      expect(result).toHaveLength(1)
      expect(result[0].spent).toBe(0)
      expect(result[0].progress.percentage).toBe(0)
      expect(result[0].progress.status).toBe('on-track')
    })
  })
})
