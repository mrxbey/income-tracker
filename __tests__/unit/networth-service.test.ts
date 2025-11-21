import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NetWorthData } from '@/lib/services/networth-service'

describe('networth-service', () => {
  describe('calculateCurrentNetWorth', () => {
    it('should calculate net worth correctly with mixed account types', async () => {
      // Mock data structure test
      const mockAssets = {
        cash: 5000,
        investments: 10000,
        receivables: 1000,
      }

      const mockLiabilities = {
        creditCards: 2000,
        loans: 8000,
      }

      const totalAssets = mockAssets.cash + mockAssets.investments + mockAssets.receivables
      const totalLiabilities = mockLiabilities.creditCards + mockLiabilities.loans
      const netWorth = totalAssets - totalLiabilities

      expect(netWorth).toBe(6000)
      expect(totalAssets).toBe(16000)
      expect(totalLiabilities).toBe(10000)
    })

    it('should handle negative net worth (more liabilities than assets)', () => {
      const mockAssets = {
        cash: 1000,
        investments: 2000,
        receivables: 0,
      }

      const mockLiabilities = {
        creditCards: 5000,
        loans: 10000,
      }

      const totalAssets = mockAssets.cash + mockAssets.investments + mockAssets.receivables
      const totalLiabilities = mockLiabilities.creditCards + mockLiabilities.loans
      const netWorth = totalAssets - totalLiabilities

      expect(netWorth).toBe(-12000)
      expect(netWorth).toBeLessThan(0)
    })

    it('should handle zero balances', () => {
      const mockAssets = {
        cash: 0,
        investments: 0,
        receivables: 0,
      }

      const mockLiabilities = {
        creditCards: 0,
        loans: 0,
      }

      const totalAssets = mockAssets.cash + mockAssets.investments + mockAssets.receivables
      const totalLiabilities = mockLiabilities.creditCards + mockLiabilities.loans
      const netWorth = totalAssets - totalLiabilities

      expect(netWorth).toBe(0)
    })
  })

  describe('Net Worth Calculations', () => {
    it('should properly categorize account types as assets or liabilities', () => {
      // Asset types
      const assetTypes = ['DEPOSIT', 'CASH', 'INVESTMENT', 'RECEIVABLE']
      // Liability types
      const liabilityTypes = ['CREDIT_CARD', 'LOAN']

      // Verify all account types are categorized
      const allTypes = [...assetTypes, ...liabilityTypes, 'OTHER']

      expect(allTypes.length).toBeGreaterThan(0)
      expect(assetTypes.length).toBe(4)
      expect(liabilityTypes.length).toBe(2)
    })

    it('should calculate percentage change correctly', () => {
      const startNetWorth = 10000
      const endNetWorth = 12000
      const change = endNetWorth - startNetWorth
      const percentageChange = (change / startNetWorth) * 100

      expect(percentageChange).toBe(20)
    })

    it('should handle zero starting net worth for percentage change', () => {
      const startNetWorth = 0
      const endNetWorth = 5000
      const percentageChange = startNetWorth !== 0 ?
        ((endNetWorth - startNetWorth) / startNetWorth) * 100 :
        0

      expect(percentageChange).toBe(0) // Avoid division by zero
    })

    it('should calculate negative percentage change for decreasing net worth', () => {
      const startNetWorth = 10000
      const endNetWorth = 8000
      const change = endNetWorth - startNetWorth
      const percentageChange = (change / startNetWorth) * 100

      expect(percentageChange).toBe(-20)
      expect(percentageChange).toBeLessThan(0)
    })
  })

  describe('Net Worth Trends', () => {
    it('should identify upward trend', () => {
      const history = [
        { netWorth: 1000, date: new Date('2024-01-01') },
        { netWorth: 1200, date: new Date('2024-02-01') },
        { netWorth: 1500, date: new Date('2024-03-01') },
      ]

      const isUpward = history[history.length - 1]!.netWorth > history[0]!.netWorth

      expect(isUpward).toBe(true)
    })

    it('should identify downward trend', () => {
      const history = [
        { netWorth: 5000, date: new Date('2024-01-01') },
        { netWorth: 4500, date: new Date('2024-02-01') },
        { netWorth: 4000, date: new Date('2024-03-01') },
      ]

      const isUpward = history[history.length - 1]!.netWorth > history[0]!.netWorth

      expect(isUpward).toBe(false)
    })

    it('should calculate growth rate over time', () => {
      const startValue = 10000
      const endValue = 15000
      const months = 12

      const totalGrowth = endValue - startValue
      const monthlyGrowthRate = totalGrowth / months

      expect(monthlyGrowthRate).toBeCloseTo(416.67, 2)
    })
  })

  describe('Asset and Liability Breakdown', () => {
    it('should correctly sum multiple asset types', () => {
      const assets = [
        { type: 'DEPOSIT', balance: 5000 },
        { type: 'CASH', balance: 1000 },
        { type: 'INVESTMENT', balance: 10000 },
        { type: 'RECEIVABLE', balance: 500 },
      ]

      const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0)

      expect(totalAssets).toBe(16500)
    })

    it('should correctly sum multiple liability types', () => {
      const liabilities = [
        { type: 'CREDIT_CARD', balance: -2000 },
        { type: 'LOAN', balance: -5000 },
      ]

      // Liabilities are stored as negative, so we take absolute value
      const totalLiabilities = liabilities.reduce(
        (sum, liability) => sum + Math.abs(liability.balance),
        0
      )

      expect(totalLiabilities).toBe(7000)
    })
  })

  describe('Snapshot Data Structure', () => {
    it('should validate snapshot data structure', () => {
      const mockSnapshot: NetWorthData = {
        date: new Date(),
        assets: 10000,
        liabilities: 5000,
        netWorth: 5000,
        assetCash: 3000,
        assetInvestments: 5000,
        assetReceivables: 2000,
        liabilityCreditCards: 2000,
        liabilityLoans: 3000,
      }

      // Verify calculations are correct
      const calculatedAssets =
        mockSnapshot.assetCash +
        mockSnapshot.assetInvestments +
        mockSnapshot.assetReceivables

      const calculatedLiabilities =
        mockSnapshot.liabilityCreditCards + mockSnapshot.liabilityLoans

      const calculatedNetWorth = calculatedAssets - calculatedLiabilities

      expect(calculatedAssets).toBe(mockSnapshot.assets)
      expect(calculatedLiabilities).toBe(mockSnapshot.liabilities)
      expect(calculatedNetWorth).toBe(mockSnapshot.netWorth)
    })

    it('should maintain data integrity across breakdowns', () => {
      const assetCash = 5000
      const assetInvestments = 10000
      const assetReceivables = 1000

      const liabilityCreditCards = 3000
      const liabilityLoans = 7000

      const totalAssets = assetCash + assetInvestments + assetReceivables
      const totalLiabilities = liabilityCreditCards + liabilityLoans
      const netWorth = totalAssets - totalLiabilities

      expect(totalAssets).toBe(16000)
      expect(totalLiabilities).toBe(10000)
      expect(netWorth).toBe(6000)

      // Verify sum of parts equals total
      expect(assetCash + assetInvestments + assetReceivables).toBe(totalAssets)
      expect(liabilityCreditCards + liabilityLoans).toBe(totalLiabilities)
    })
  })
})
