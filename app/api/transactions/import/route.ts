import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/prisma'
import { TxnType, TransactionSource } from '@prisma/client'
import { Decimal } from 'decimal.js'
import { applyRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

interface ImportTransactionData {
  accountId: string
  postedAt: string
  amount: number
  currency: string
  description: string
  merchant: string | null
  type: TxnType
  categoryName?: string
  source: string
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for expensive bulk operations
    const rateLimitResult = applyRateLimit(request, 'EXPENSIVE')
    if (!rateLimitResult.success) return rateLimitResult.response

    const session = await auth()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { accountId, transactions } = body as {
      accountId: string
      transactions: ImportTransactionData[]
    }

    if (!accountId || !transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId and transactions' },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: session.userId,
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Get user's categories for mapping
    const categories = await prisma.category.findMany({
      where: {
        userId: session.userId,
      },
    })

    // Build category name to ID map
    const categoryMap = new Map<string, string>()
    categories.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id)
    })

    // Import transactions atomically within a database transaction
    const result = await prisma.$transaction(async (tx) => {
      const imported: string[] = []
      const errors: string[] = []

      // Prepare transaction data
      const transactionData = transactions.map((txn) => {
        // Find category by name if provided
        let categoryId: string | undefined = undefined
        if (txn.categoryName) {
          categoryId = categoryMap.get(txn.categoryName.toLowerCase())
        }

        return {
          accountId: txn.accountId,
          postedAt: new Date(txn.postedAt),
          amount: new Decimal(txn.amount),
          currency: txn.currency,
          description: txn.description,
          merchant: txn.merchant,
          type: txn.type,
          categoryId: categoryId || null,
          source: TransactionSource.MANUAL,
          reviewStatus: 'NONE',
        }
      })

      // Create all transactions atomically
      // Note: createMany doesn't return created records, so we need to handle differently
      // if we need IDs for response
      for (let i = 0; i < transactionData.length; i++) {
        try {
          const created = await tx.transaction.create({
            data: transactionData[i]!,
          })
          imported.push(created.id)
        } catch (err) {
          console.error(`Error importing transaction ${i}:`, err)
          errors.push(
            `Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`
          )
        }
      }

      // Update account balance atomically in the same transaction
      if (imported.length > 0) {
        const totalAmount = transactions
          .slice(0, imported.length)
          .reduce((sum, txn) => sum + txn.amount, 0)

        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              increment: new Decimal(totalAmount),
            },
          },
        })
      }

      return { imported, errors }
    })

    const { imported, errors } = result

    return NextResponse.json(
      {
        success: true,
        imported: imported.length,
        errors: errors.length > 0 ? errors : undefined,
        total: transactions.length,
      },
      {
        headers: getRateLimitHeaders('EXPENSIVE', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error importing transactions:', error)
    return NextResponse.json(
      {
        error: 'Failed to import transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
