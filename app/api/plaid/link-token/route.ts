import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createLinkToken } from '@/lib/services/plaid-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/plaid/link-token
 * Create a Plaid Link token for the authenticated user
 */
export async function POST(_request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const linkToken = await createLinkToken(userId)

    return NextResponse.json(linkToken)
  } catch (error) {
    console.error('Error in link-token POST route:', error)
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    )
  }
}
