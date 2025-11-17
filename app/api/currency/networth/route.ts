import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getNetWorthInCurrencies } from '@/lib/services/currency-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/currency/networth?currencies=USD,TRY,GBP
 * Get net worth in multiple currencies
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(_request.url)
    const currenciesParam = searchParams.get('currencies') || 'USD,TRY,GBP,EUR'
    const currencies = currenciesParam.split(',').map((c) => c.trim())

    const balances = await getNetWorthInCurrencies(userId, currencies)

    return NextResponse.json({ balances })
  } catch (error) {
    console.error('Error in currency networth route:', error)
    return NextResponse.json(
      { error: 'Failed to get net worth in currencies' },
      { status: 500 }
    )
  }
}
