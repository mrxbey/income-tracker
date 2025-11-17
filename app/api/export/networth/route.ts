import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { exportNetWorthHistory } from '@/lib/services/export-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/export/networth?daysBack=90
 * Export net worth history
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(_request.url)
    const daysBack = parseInt(searchParams.get('daysBack') || '90')

    const content = await exportNetWorthHistory({
      userId,
      daysBack,
    })

    const filename = `networth-history-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error in export networth route:', error)
    return NextResponse.json({ error: 'Failed to export net worth history' }, { status: 500 })
  }
}
