import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/budgets/route'
import { NextRequest } from 'next/server'
import { db as prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'

vi.mock('@/lib/prisma')
vi.mock('@clerk/nextjs/server')

describe('Budget API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/budgets', () => {
    it('should return budgets for authenticated user', async () => {
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
          },
        },
      ]

      vi.mocked(prisma.budget.findMany).mockResolvedValue(mockBudgets as any)

      const request = new NextRequest('http://localhost:3000/api/budgets')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('budget-1')
    })

    it('should return 401 if user not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: null } as any)

      const request = new NextRequest('http://localhost:3000/api/budgets')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/budgets', () => {
    it('should create a new budget', async () => {
      const newBudget = {
        categoryId: 'cat-1',
        amount: 1000,
        currency: 'USD',
        period: 'MONTHLY',
        startDate: '2025-01-01',
      }

      const mockCreatedBudget = {
        id: 'budget-1',
        userId: 'user-1',
        ...newBudget,
        amount: new Decimal(newBudget.amount),
        startDate: new Date(newBudget.startDate),
        endDate: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.budget.create).mockResolvedValue(mockCreatedBudget as any)

      const request = new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        body: JSON.stringify(newBudget),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('budget-1')
      expect(prisma.budget.create).toHaveBeenCalled()
    })

    it('should return 400 for invalid budget data', async () => {
      const invalidBudget = {
        categoryId: 'cat-1',
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        body: JSON.stringify(invalidBudget),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})
