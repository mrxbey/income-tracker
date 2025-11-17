import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getNetWorthHistory, getNetWorthStats, saveNetWorthSnapshot } from '@/lib/services/networth-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/networth?days=90
 * Get net worth history
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '90', 10)
    const includeStats = searchParams.get('stats') === 'true'

    const history = await getNetWorthHistory(userId, days)
    const stats = includeStats ? await getNetWorthStats(userId) : null

    return NextResponse.json({
      history,
      stats,
    })
  } catch (error) {
    console.error('Error in networth GET route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch net worth data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/networth
 * Save current net worth snapshot
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const snapshot = await saveNetWorthSnapshot(userId)

    return NextResponse.json({ snapshot })
  } catch (error) {
    console.error('Error in networth POST route:', error)
    return NextResponse.json(
      { error: 'Failed to save net worth snapshot' },
      { status: 500 }
    )
  }
}
