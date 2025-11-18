import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getBudgetSummary } from '@/lib/services/budget-service'
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

      const result = await getBudgetSummary('user-1')

      expect(result.budgets).toHaveLength(1)
      expect(result.budgets[0]!.categoryName).toBe('Groceries')
      expect(result.budgets[0]!.actualAmount).toBe(750)
      expect(result.totalBudget).toBe(1000)
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

      const result = await getBudgetSummary('user-1')

      expect(result.budgets).toHaveLength(1)
      expect(result.budgets[0]!.actualAmount).toBe(0)
      expect(result.budgets[0]!.remaining).toBe(1000)
      expect(result.budgets[0]!.percentage).toBe(0)
    })

    it('should calculate overbudget correctly', async () => {
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

      const mockSpending = [
        {
          categoryId: 'cat-1',
          _sum: { amount: new Decimal(-1200) },
        },
      ]

      vi.mocked(prisma.budget.findMany).mockResolvedValue(mockBudgets as any)
      vi.mocked(prisma.transaction.groupBy).mockResolvedValue(mockSpending as any)

      const result = await getBudgetSummary('user-1')

      expect(result.budgets[0]!.isOverBudget).toBe(true)
      expect(result.budgets[0]!.percentage).toBe(120)
      expect(result.overBudgetCount).toBe(1)
    })
  })
})
