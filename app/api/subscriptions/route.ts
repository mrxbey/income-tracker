import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import {
  detectSubscriptions,
  getSubscriptionStats,
  getSubscriptionAlerts,
} from '@/lib/services/subscription-service'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'stats':
        const stats = await getSubscriptionStats(session.userId)
        return NextResponse.json({ stats })

      case 'alerts':
        const alerts = await getSubscriptionAlerts(session.userId)
        return NextResponse.json({ alerts })

      default:
        const subscriptions = await detectSubscriptions(session.userId)
        return NextResponse.json({ subscriptions })
    }
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch subscriptions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
