import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getBudgetSummary } from '@/lib/services/budget-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/budgets/summary
 * Get budget summary for the current month
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await getBudgetSummary(userId)

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error in budgets summary route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget summary' },
      { status: 500 }
    )
  }
}
