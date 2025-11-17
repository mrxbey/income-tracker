import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateSpendingAlerts } from '@/lib/ai/spending-alerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/ai/spending-alerts
 * Get spending alerts for the authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const alerts = await generateSpendingAlerts(userId)

    return NextResponse.json({
      alerts,
      count: alerts.length,
    })
  } catch (error) {
    console.error('Error in spending-alerts route:', error)
    return NextResponse.json(
      { error: 'Failed to generate spending alerts' },
      { status: 500 }
    )
  }
}
