import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { convertCurrency, getNetWorthInCurrencies } from '@/lib/services/currency-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/currency/convert?amount=100&from=USD&to=TRY
 * Convert amount between currencies
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const amount = parseFloat(searchParams.get('amount') || '0')
    const fromCurrency = searchParams.get('from') || 'USD'
    const toCurrency = searchParams.get('to') || 'USD'

    if (amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const conversion = await convertCurrency(userId, amount, fromCurrency, toCurrency)

    if (!conversion) {
      return NextResponse.json(
        { error: `No exchange rate found for ${fromCurrency} to ${toCurrency}` },
        { status: 404 }
      )
    }

    return NextResponse.json(conversion)
  } catch (error) {
    console.error('Error in currency convert route:', error)
    return NextResponse.json(
      { error: 'Failed to convert currency' },
      { status: 500 }
    )
  }
}
