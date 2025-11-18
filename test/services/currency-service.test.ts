import { describe, it, expect, vi, beforeEach } from 'vitest'
import { convertAmount, getExchangeRate, calculateMultiCurrencyNetWorth } from '@/lib/services/currency-service'
import { db as prisma } from '@/lib/prisma'
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

  describe('convertAmount', () => {
    it('should convert amount using exchange rate', async () => {
      const mockRate = {
        id: 'rate-1',
        userId: 'user-1',
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        rate: new Decimal(0.85),
        date: new Date(),
        source: 'USER',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.exchangeRate.findFirst).mockResolvedValue(mockRate as any)

      const result = await convertAmount(100, 'USD', 'EUR', 'user-1')

      expect(result).toBe(85)
    })

    it('should return same amount for same currency', async () => {
      const result = await convertAmount(100, 'USD', 'USD', 'user-1')

      expect(result).toBe(100)
      expect(prisma.exchangeRate.findFirst).not.toHaveBeenCalled()
    })

    it('should handle missing exchange rate', async () => {
      vi.mocked(prisma.exchangeRate.findFirst).mockResolvedValue(null)

      await expect(convertAmount(100, 'USD', 'EUR', 'user-1')).rejects.toThrow()
    })
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
        source: 'USER',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.exchangeRate.findFirst).mockResolvedValue(mockRate as any)

      const result = await getExchangeRate('USD', 'EUR', 'user-1')

      expect(result).toBe(0.85)
    })

    it('should return 1 for same currency pair', async () => {
      const result = await getExchangeRate('USD', 'USD', 'user-1')

      expect(result).toBe(1)
    })
  })

  describe('calculateMultiCurrencyNetWorth', () => {
    it('should calculate net worth across multiple currencies', async () => {
      const mockAccounts = [
        {
          id: 'acc-1',
          userId: 'user-1',
          type: 'DEPOSIT',
          currency: 'USD',
          balance: new Decimal(1000),
        },
        {
          id: 'acc-2',
          userId: 'user-1',
          type: 'DEPOSIT',
          currency: 'EUR',
          balance: new Decimal(500),
        },
      ]

      const mockRate = {
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        rate: new Decimal(1.2),
      }

      vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts as any)
      vi.mocked(prisma.exchangeRate.findFirst).mockResolvedValue(mockRate as any)

      const result = await calculateMultiCurrencyNetWorth('user-1', 'USD')

      // 1000 USD + (500 EUR * 1.2) = 1000 + 600 = 1600 USD
      expect(result.totalNetWorth).toBe(1600)
      expect(result.currency).toBe('USD')
      expect(result.breakdown).toHaveLength(2)
    })
  })
})
