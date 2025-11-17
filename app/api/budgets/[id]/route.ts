import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateBudget, deleteBudget } from '@/lib/services/budget-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/budgets/[id]
 * Update a budget
 */
export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const budgetId = params.id
    const body = await _request.json()

    const { amount, startDate, endDate, isActive } = body

    const updateData: Parameters<typeof updateBudget>[2] = {}

    if (amount !== undefined) updateData.amount = Number(amount)
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)

    const budget = await updateBudget(userId, budgetId, updateData)

    return NextResponse.json({ budget })
  } catch (error) {
    console.error('Error in budget PATCH route:', error)
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/budgets/[id]
 * Delete a budget
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const budgetId = params.id

    await deleteBudget(userId, budgetId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in budget DELETE route:', error)
    return NextResponse.json(
      { error: 'Failed to delete budget' },
      { status: 500 }
    )
  }
}
