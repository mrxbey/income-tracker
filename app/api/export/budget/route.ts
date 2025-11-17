import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { exportBudgetSummary } from '@/lib/services/export-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/export/budget?month=2024-01
 * Export budget summary
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(_request.url)
    const month = searchParams.get('month') // Format: YYYY-MM

    let monthDate: Date | undefined
    if (month) {
      const [year, monthNum] = month.split('-')
      monthDate = new Date(parseInt(year!), parseInt(monthNum!) - 1, 1)
    }

    const content = await exportBudgetSummary({
      userId,
      month: monthDate,
    })

    const filename = `budget-summary-${month || new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error in export budget route:', error)
    return NextResponse.json({ error: 'Failed to export budget' }, { status: 500 })
  }
}
