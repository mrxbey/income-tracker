import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserGoals, createGoal } from '@/lib/services/goal-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/goals
 * Get all goals for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const goals = await getUserGoals(userId)

    return NextResponse.json({ goals })
  } catch (error) {
    console.error('Error in goals GET route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/goals
 * Create a new goal
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, targetAmount, currentAmount, currency, targetDate, accountId } = body

    if (!name || !targetAmount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields: name, targetAmount, currency' },
        { status: 400 }
      )
    }

    const goal = await createGoal(userId, {
      name,
      description,
      targetAmount: Number(targetAmount),
      currentAmount: currentAmount ? Number(currentAmount) : 0,
      currency,
      targetDate: targetDate ? new Date(targetDate) : null,
      accountId,
    })

    return NextResponse.json({ goal }, { status: 201 })
  } catch (error) {
    console.error('Error in goals POST route:', error)
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    )
  }
}
