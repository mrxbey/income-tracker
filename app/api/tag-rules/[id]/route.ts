import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateTagRule, deleteTagRule } from '@/lib/services/tag-rule-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/tag-rules/[id]
 * Update a tag rule
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
    const ruleId = params.id
    const body = await request.json()

    const rule = await updateTagRule(userId, ruleId, body)

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Error in tag-rule PATCH route:', error)
    return NextResponse.json(
      { error: 'Failed to update tag rule' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tag-rules/[id]
 * Delete a tag rule
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
    const ruleId = params.id

    await deleteTagRule(userId, ruleId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in tag-rule DELETE route:', error)
    return NextResponse.json(
      { error: 'Failed to delete tag rule' },
      { status: 500 }
    )
  }
}
