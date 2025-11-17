import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createBudget, getUserBudgets } from '@/lib/services/budget-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/budgets
 * Get all budgets for the authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const budgets = await getUserBudgets(userId)

    return NextResponse.json({ budgets })
  } catch (error) {
    console.error('Error in budgets GET route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/budgets
 * Create a new budget
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { categoryId, amount, currency, startDate, endDate } = body

    // Validation
    if (!categoryId || !amount || !currency || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: categoryId, amount, currency, startDate' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Budget amount must be greater than 0' },
        { status: 400 }
      )
    }

    const budget = await createBudget(userId, {
      categoryId,
      amount: Number(amount),
      currency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
    })

    return NextResponse.json({ budget }, { status: 201 })
  } catch (error) {
    console.error('Error in budgets POST route:', error)
    return NextResponse.json(
      { error: 'Failed to create budget' },
      { status: 500 }
    )
  }
}
