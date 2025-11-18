import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createLinkToken } from '@/lib/services/plaid-service'
import { applyRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/plaid/link-token
 * Create a Plaid Link token for the authenticated user
 *
 * Rate limited: 10 requests per minute (expensive external API call)
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting (expensive Plaid API call)
  const rateLimitResult = applyRateLimit(request, 'EXPENSIVE')
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const linkToken = await createLinkToken(userId)

    return NextResponse.json(linkToken, {
      headers: getRateLimitHeaders('EXPENSIVE', rateLimitResult.remaining, rateLimitResult.reset),
    })
  } catch (error) {
    console.error('Error in link-token POST route:', error)
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    )
  }
}
