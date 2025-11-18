import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db as prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/bank-connections
 * Get all bank connections for the authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connections = await prisma.bankConnection.findMany({
      where: {
        userId,
      },
      include: {
        accounts: {
          select: {
            id: true,
            name: true,
            type: true,
            balance: true,
            currency: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ connections })
  } catch (error) {
    console.error('Error in bank-connections GET route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bank connections' },
      { status: 500 }
    )
  }
}
