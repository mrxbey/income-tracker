import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db as prisma } from '@/lib/prisma'
import { removeItem } from '@/lib/services/plaid-service'
import { decrypt } from '@/lib/crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * DELETE /api/bank-connections/[id]
 * Disconnect a bank connection
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the connection
    const connection = await prisma.bankConnection.findUnique({
      where: {
        id,
        userId,
      },
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Bank connection not found' },
        { status: 404 }
      )
    }

    // Decrypt access token before using it
    const accessToken = decrypt(connection.accessToken)

    // Remove from Plaid
    try {
      await removeItem(accessToken)
    } catch (error) {
      console.error('Error removing Plaid item:', error)
      // Continue with database deletion even if Plaid removal fails
    }

    // Delete the connection (cascade delete will handle accounts)
    await prisma.bankConnection.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in bank-connections DELETE route:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect bank' },
      { status: 500 }
    )
  }
}
