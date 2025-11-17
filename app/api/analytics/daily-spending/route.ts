import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db as prisma } from '@/lib/prisma'
import { TxnType } from '@prisma/client'
import { eachDayOfInterval, format } from 'date-fns'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/daily-spending?dateFrom=2024-01-01&dateTo=2024-01-31
 * Get daily spending breakdown for heatmap
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(_request.url)
    const dateFromStr = searchParams.get('dateFrom')
    const dateToStr = searchParams.get('dateTo')

    if (!dateFromStr || !dateToStr) {
      return NextResponse.json({ error: 'dateFrom and dateTo are required' }, { status: 400 })
    }

    const dateFrom = new Date(dateFromStr)
    const dateTo = new Date(dateToStr)

    // Get all expense transactions in the date range
    const transactions = await prisma.transaction.findMany({
      where: {
        account: {
          userId,
        },
        type: TxnType.EXPENSE,
        postedAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        amount: true,
        postedAt: true,
      },
    })

    // Create a map of date -> {amount, count}
    const dailyMap = new Map<string, { amount: number; count: number }>()

    // Initialize all days in range with zero
    const allDays = eachDayOfInterval({ start: dateFrom, end: dateTo })
    allDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd')
      dailyMap.set(dateKey, { amount: 0, count: 0 })
    })

    // Aggregate transactions by day
    transactions.forEach((txn) => {
      const dateKey = format(txn.postedAt, 'yyyy-MM-dd')
      const existing = dailyMap.get(dateKey) || { amount: 0, count: 0 }

      dailyMap.set(dateKey, {
        amount: existing.amount + Math.abs(Number(txn.amount)),
        count: existing.count + 1,
      })
    })

    // Convert to array format
    const dailySpending = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      amount: data.amount,
      transactionCount: data.count,
    }))

    return NextResponse.json({
      dailySpending,
      totalSpending: dailySpending.reduce((sum, d) => sum + d.amount, 0),
      totalTransactions: dailySpending.reduce((sum, d) => sum + d.transactionCount, 0),
    })
  } catch (error) {
    console.error('Error in daily spending route:', error)
    return NextResponse.json({ error: 'Failed to get daily spending' }, { status: 500 })
  }
}
