import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createTagRule, getUserTagRules, suggestTagRules } from '@/lib/services/tag-rule-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/tag-rules?suggest=true
 * Get user's tag rules or suggestions
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(_request.url)
    const suggest = searchParams.get('suggest') === 'true'

    if (suggest) {
      const suggestions = await suggestTagRules(userId)
      return NextResponse.json({ suggestions })
    }

    const rules = await getUserTagRules(userId)
    return NextResponse.json({ rules })
  } catch (error) {
    console.error('Error in tag-rules GET route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tag rules' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tag-rules
 * Create a new tag rule
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pattern, patternType, tagIds, categoryId, confidenceBoost, priority } = body

    if (!pattern || !patternType || !tagIds || tagIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: pattern, patternType, tagIds' },
        { status: 400 }
      )
    }

    const rule = await createTagRule(userId, {
      pattern,
      patternType,
      tagIds,
      categoryId,
      confidenceBoost,
      priority,
    })

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('Error in tag-rules POST route:', error)
    return NextResponse.json(
      { error: 'Failed to create tag rule' },
      { status: 500 }
    )
  }
}
