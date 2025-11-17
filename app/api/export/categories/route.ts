import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { exportCategorySummary } from '@/lib/services/export-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/export/categories?dateFrom=2024-01-01&dateTo=2024-12-31
 * Export category summary
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(_request.url)
    const dateFrom = searchParams.get('dateFrom')
      ? new Date(searchParams.get('dateFrom')!)
      : undefined
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined

    const content = await exportCategorySummary({
      userId,
      dateFrom,
      dateTo,
    })

    const filename = `category-summary-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error in export categories route:', error)
    return NextResponse.json({ error: 'Failed to export category summary' }, { status: 500 })
  }
}
