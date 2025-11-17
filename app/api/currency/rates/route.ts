import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { saveExchangeRate, getUserExchangeRates } from '@/lib/services/currency-service'
import { ExchangeRateSource } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/currency/rates
 * Get user's exchange rates
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rates = await getUserExchangeRates(userId)

    return NextResponse.json({ rates })
  } catch (error) {
    console.error('Error in currency rates GET route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exchange rates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/currency/rates
 * Save a new exchange rate
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fromCurrency, toCurrency, rate, notes } = body

    if (!fromCurrency || !toCurrency || !rate) {
      return NextResponse.json(
        { error: 'Missing required fields: fromCurrency, toCurrency, rate' },
        { status: 400 }
      )
    }

    if (rate <= 0) {
      return NextResponse.json(
        { error: 'Exchange rate must be greater than 0' },
        { status: 400 }
      )
    }

    const exchangeRate = await saveExchangeRate(
      userId,
      fromCurrency,
      toCurrency,
      Number(rate),
      ExchangeRateSource.USER,
      notes
    )

    return NextResponse.json({ exchangeRate }, { status: 201 })
  } catch (error) {
    console.error('Error in currency rates POST route:', error)
    return NextResponse.json(
      { error: 'Failed to save exchange rate' },
      { status: 500 }
    )
  }
}
