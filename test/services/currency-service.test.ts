import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getExchangeRate } from '@/lib/services/currency-service'
import { db as prisma } from '@/lib/prisma'
import { ExchangeRateSource } from '@prisma/client'
import Decimal from 'decimal.js'

vi.mock('@/lib/prisma', () => ({
  db: {
    exchangeRate: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
    },
  },
}))

describe('Currency Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getExchangeRate', () => {
    it('should get latest exchange rate', async () => {
      const mockRate = {
        id: 'rate-1',
        userId: 'user-1',
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        rate: new Decimal(0.85),
        date: new Date(),
        source: ExchangeRateSource.USER,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.exchangeRate.findFirst).mockResolvedValue(mockRate as any)

      const result = await getExchangeRate('user-1', 'USD', 'EUR')

      expect(result).not.toBeNull()
      expect(result?.rate).toBe(0.85)
      expect(result?.source).toBe(ExchangeRateSource.USER)
    })

    it('should return rate=1 for same currency pair', async () => {
      const result = await getExchangeRate('user-1', 'USD', 'USD')

      expect(result).not.toBeNull()
      expect(result?.rate).toBe(1)
      expect(result?.source).toBe(ExchangeRateSource.SYSTEM)
      expect(prisma.exchangeRate.findFirst).not.toHaveBeenCalled()
    })

    it('should return null if no rate found', async () => {
      vi.mocked(prisma.exchangeRate.findFirst).mockResolvedValue(null)

      const result = await getExchangeRate('user-1', 'USD', 'EUR')

      expect(result).toBeNull()
    })
  })
})
