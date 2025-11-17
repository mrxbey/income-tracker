import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateGoalProgress, deleteGoal } from '@/lib/services/goal-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/goals/[id]
 * Update goal progress
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const goalId = params.id
    const body = await request.json()
    const { currentAmount } = body

    if (currentAmount === undefined) {
      return NextResponse.json(
        { error: 'currentAmount is required' },
        { status: 400 }
      )
    }

    const goal = await updateGoalProgress(userId, goalId, Number(currentAmount))

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Error in goal PATCH route:', error)
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/goals/[id]
 * Delete a goal
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const goalId = params.id

    await deleteGoal(userId, goalId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in goal DELETE route:', error)
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    )
  }
}
