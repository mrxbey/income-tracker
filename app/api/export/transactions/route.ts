import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { exportTransactionsToCSV, exportTransactionsToJSON } from '@/lib/services/export-service'
import { TxnType } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/export/transactions?format=CSV&dateFrom=2024-01-01&dateTo=2024-12-31
 * Export transactions
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(_request.url)
    const format = (searchParams.get('format') || 'CSV').toUpperCase() as 'CSV' | 'JSON'
    const dateFrom = searchParams.get('dateFrom')
      ? new Date(searchParams.get('dateFrom')!)
      : undefined
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined
    const categoryIds = searchParams.get('categoryIds')?.split(',') || undefined
    const accountIds = searchParams.get('accountIds')?.split(',') || undefined
    const types = searchParams.get('types')?.split(',') as TxnType[] | undefined

    let content: string
    let contentType: string
    let filename: string

    if (format === 'JSON') {
      content = await exportTransactionsToJSON({
        userId,
        format,
        dateFrom,
        dateTo,
        categoryIds,
        accountIds,
        types,
      })
      contentType = 'application/json'
      filename = `transactions-${new Date().toISOString().split('T')[0]}.json`
    } else {
      content = await exportTransactionsToCSV({
        userId,
        format,
        dateFrom,
        dateTo,
        categoryIds,
        accountIds,
        types,
      })
      contentType = 'text/csv'
      filename = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error in export transactions route:', error)
    return NextResponse.json({ error: 'Failed to export transactions' }, { status: 500 })
  }
}
