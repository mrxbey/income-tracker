import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/prisma'
import { TxnType, TransactionSource } from '@prisma/client'
import { Decimal } from 'decimal.js'

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

export async function POST(request: Request) {
  try {
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

    // Import transactions
    const imported: string[] = []
    const errors: string[] = []

    for (let i = 0; i < transactions.length; i++) {
      const txn = transactions[i]!

      try {
        // Find category by name if provided
        let categoryId: string | undefined = undefined
        if (txn.categoryName) {
          categoryId = categoryMap.get(txn.categoryName.toLowerCase())
        }

        // Create transaction
        const created = await prisma.transaction.create({
          data: {
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
          },
        })

        imported.push(created.id)
      } catch (err) {
        console.error(`Error importing transaction ${i}:`, err)
        errors.push(
          `Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      }
    }

    // Update account balance
    if (imported.length > 0) {
      const totalAmount = transactions
        .slice(0, imported.length)
        .reduce((sum, txn) => sum + txn.amount, 0)

      await prisma.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: new Decimal(totalAmount),
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      errors: errors.length > 0 ? errors : undefined,
      total: transactions.length,
    })
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
