import { prisma } from '@/lib/db'
import { AccountType } from '@prisma/client'

export interface NetWorthData {
  date: Date
  assets: number
  liabilities: number
  netWorth: number
  assetCash: number
  assetInvestments: number
  assetReceivables: number
  liabilityCreditCards: number
  liabilityLoans: number
}

/**
 * Calculate current net worth from account balances
 */
export async function calculateCurrentNetWorth(userId: string): Promise<NetWorthData> {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      isActive: true,
    },
  })

  const breakdown = {
    assetCash: 0,
    assetInvestments: 0,
    assetReceivables: 0,
    liabilityCreditCards: 0,
    liabilityLoans: 0,
  }

  for (const account of accounts) {
    const balance = Number(account.balance)

    switch (account.type) {
      case AccountType.DEPOSIT:
      case AccountType.CASH:
        breakdown.assetCash += balance
        break
      case AccountType.INVESTMENT:
        breakdown.assetInvestments += balance
        break
      case AccountType.RECEIVABLE:
        breakdown.assetReceivables += balance
        break
      case AccountType.CREDIT_CARD:
        breakdown.liabilityCreditCards += Math.abs(balance)
        break
      case AccountType.LOAN:
        breakdown.liabilityLoans += Math.abs(balance)
        break
    }
  }

  const assets = breakdown.assetCash + breakdown.assetInvestments + breakdown.assetReceivables
  const liabilities = breakdown.liabilityCreditCards + breakdown.liabilityLoans
  const netWorth = assets - liabilities

  return {
    date: new Date(),
    assets,
    liabilities,
    netWorth,
    ...breakdown,
  }
}

/**
 * Save a net worth snapshot
 */
export async function saveNetWorthSnapshot(userId: string): Promise<NetWorthData> {
  const netWorthData = await calculateCurrentNetWorth(userId)

  // Check if snapshot already exists for today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existing = await prisma.netWorthSnapshot.findFirst({
    where: {
      userId,
      takenAt: {
        gte: today,
      },
    },
  })

  if (existing) {
    // Update existing snapshot
    await prisma.netWorthSnapshot.update({
      where: {
        id: existing.id,
      },
      data: {
        assetCash: netWorthData.assetCash,
        assetInvestments: netWorthData.assetInvestments,
        assetReceivables: netWorthData.assetReceivables,
        liabilityCreditCards: netWorthData.liabilityCreditCards,
        liabilityLoans: netWorthData.liabilityLoans,
        assets: netWorthData.assets,
        liabilities: netWorthData.liabilities,
        netWorth: netWorthData.netWorth,
      },
    })
  } else {
    // Create new snapshot
    await prisma.netWorthSnapshot.create({
      data: {
        userId,
        takenAt: new Date(),
        assetCash: netWorthData.assetCash,
        assetInvestments: netWorthData.assetInvestments,
        assetReceivables: netWorthData.assetReceivables,
        liabilityCreditCards: netWorthData.liabilityCreditCards,
        liabilityLoans: netWorthData.liabilityLoans,
        assets: netWorthData.assets,
        liabilities: netWorthData.liabilities,
        netWorth: netWorthData.netWorth,
      },
    })
  }

  return netWorthData
}

/**
 * Get net worth history
 */
export async function getNetWorthHistory(
  userId: string,
  daysBack = 90
): Promise<NetWorthData[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)

  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: {
      userId,
      takenAt: {
        gte: startDate,
      },
    },
    orderBy: {
      takenAt: 'asc',
    },
  })

  return snapshots.map((snapshot) => ({
    date: snapshot.takenAt,
    assets: Number(snapshot.assets),
    liabilities: Number(snapshot.liabilities),
    netWorth: Number(snapshot.netWorth),
    assetCash: Number(snapshot.assetCash),
    assetInvestments: Number(snapshot.assetInvestments),
    assetReceivables: Number(snapshot.assetReceivables),
    liabilityCreditCards: Number(snapshot.liabilityCreditCards),
    liabilityLoans: Number(snapshot.liabilityLoans),
  }))
}

/**
 * Get net worth statistics
 */
export async function getNetWorthStats(userId: string) {
  const history = await getNetWorthHistory(userId, 365) // Last year

  if (history.length === 0) {
    return {
      current: 0,
      change30Days: 0,
      change90Days: 0,
      changeYear: 0,
      percentChange30Days: 0,
      percentChange90Days: 0,
      percentChangeYear: 0,
      allTimeHigh: 0,
      allTimeLow: 0,
    }
  }

  const current = history[history.length - 1].netWorth

  // Find values at different time periods
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const find30 = history.findLast((h) => h.date <= thirtyDaysAgo)
  const find90 = history.findLast((h) => h.date <= ninetyDaysAgo)
  const findYear = history.findLast((h) => h.date <= oneYearAgo)

  const value30 = find30?.netWorth || current
  const value90 = find90?.netWorth || current
  const valueYear = findYear?.netWorth || current

  const change30Days = current - value30
  const change90Days = current - value90
  const changeYear = current - valueYear

  const percentChange30Days = value30 !== 0 ? (change30Days / value30) * 100 : 0
  const percentChange90Days = value90 !== 0 ? (change90Days / value90) * 100 : 0
  const percentChangeYear = valueYear !== 0 ? (changeYear / valueYear) * 100 : 0

  const allTimeHigh = Math.max(...history.map((h) => h.netWorth))
  const allTimeLow = Math.min(...history.map((h) => h.netWorth))

  return {
    current,
    change30Days,
    change90Days,
    changeYear,
    percentChange30Days,
    percentChange90Days,
    percentChangeYear,
    allTimeHigh,
    allTimeLow,
  }
}
