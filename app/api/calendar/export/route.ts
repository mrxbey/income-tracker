import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { generateFinancialCalendar } from '@/lib/services/calendar-service'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeSubscriptions = searchParams.get('subscriptions') !== 'false'
    const includeBills = searchParams.get('bills') !== 'false'
    const includeGoals = searchParams.get('goals') !== 'false'
    const includeBudgets = searchParams.get('budgets') !== 'false'
    const monthsAhead = parseInt(searchParams.get('months') || '12', 10)

    const result = await generateFinancialCalendar(session.userId, {
      includeSubscriptions,
      includeBills,
      includeGoals,
      includeBudgets,
      monthsAhead,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate calendar' },
        { status: 500 }
      )
    }

    // Return as downloadable .ics file
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="financial-calendar.ics"',
      },
    })
  } catch (error) {
    console.error('Error exporting calendar:', error)
    return NextResponse.json(
      {
        error: 'Failed to export calendar',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
