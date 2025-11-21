import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  createTransactionSplits,
  getTransactionWithSplits,
  deleteTransactionSplits,
} from '@/lib/services/split-transaction-service'
import { db as prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/transactions/[id]/splits
 * Get transaction with splits
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const transactionId = params.id

    // Verify transaction belongs to the user (IDOR protection)
    const transactionOwnership = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        account: { userId },
      },
    })

    if (!transactionOwnership) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const transaction = await getTransactionWithSplits(transactionId)

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error in transaction splits GET route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transaction splits' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/transactions/[id]/splits
 * Create or update splits for a transaction
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const transactionId = params.id

    // Verify transaction belongs to the user (IDOR protection)
    const transactionOwnership = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        account: { userId },
      },
    })

    if (!transactionOwnership) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const body = await _request.json()
    const { splits } = body

    if (!splits || !Array.isArray(splits)) {
      return NextResponse.json(
        { error: 'Splits array is required' },
        { status: 400 }
      )
    }

    if (splits.length === 0) {
      return NextResponse.json(
        { error: 'At least one split is required' },
        { status: 400 }
      )
    }

    // Validate each split
    for (const split of splits) {
      if (!split.categoryId || !split.amount) {
        return NextResponse.json(
          { error: 'Each split must have categoryId and amount' },
          { status: 400 }
        )
      }
    }

    await createTransactionSplits(transactionId, splits)

    const transaction = await getTransactionWithSplits(transactionId)

    return NextResponse.json(transaction)
  } catch (error: unknown) {
    console.error('Error in transaction splits POST route:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create transaction splits'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/transactions/[id]/splits
 * Remove all splits from a transaction
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
    const transactionId = params.id

    // Verify transaction belongs to the user (IDOR protection)
    const transactionOwnership = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        account: { userId },
      },
    })

    if (!transactionOwnership) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const { searchParams } = new URL(_request.url)
    const newCategoryId = searchParams.get('categoryId')

    await deleteTransactionSplits(transactionId, newCategoryId || undefined)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in transaction splits DELETE route:', error)
    return NextResponse.json(
      { error: 'Failed to delete transaction splits' },
      { status: 500 }
    )
  }
}
