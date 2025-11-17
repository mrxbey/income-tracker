import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { detectRecurringPatterns, createFixedExpenseFromPattern } from '@/lib/ai/recurring-detection'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/ai/detect-recurring
 * Detect recurring transaction patterns for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const minOccurrences = parseInt(searchParams.get('minOccurrences') || '3', 10)

    const patterns = await detectRecurringPatterns(userId, minOccurrences)

    return NextResponse.json({
      patterns,
      count: patterns.length,
    })
  } catch (error) {
    console.error('Error in detect-recurring route:', error)
    return NextResponse.json(
      { error: 'Failed to detect recurring patterns' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai/detect-recurring
 * Create a FixedExpense from a detected recurring pattern
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pattern, accountId } = body

    if (!pattern) {
      return NextResponse.json({ error: 'Pattern is required' }, { status: 400 })
    }

    const result = await createFixedExpenseFromPattern(userId, pattern, accountId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      fixedExpenseId: result.fixedExpenseId,
    })
  } catch (error) {
    console.error('Error creating fixed expense from pattern:', error)
    return NextResponse.json(
      { error: 'Failed to create fixed expense' },
      { status: 500 }
    )
  }
}
