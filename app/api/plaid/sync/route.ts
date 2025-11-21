import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { syncTransactions } from '@/lib/services/plaid-service'
import { db as prisma } from '@/lib/prisma'
import { TxnType } from '@prisma/client'
import { Decimal } from 'decimal.js'
import { decrypt } from '@/lib/crypto'
import { applyRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/plaid/sync
 * Sync transactions from Plaid for a specific bank connection
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for expensive Plaid operations
    const rateLimitResult = applyRateLimit(request, 'EXPENSIVE')
    if (!rateLimitResult.success) return rateLimitResult.response

    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { connectionId } = body

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing connection ID' },
        { status: 400 }
      )
    }

    // Get bank connection
    const connection = await prisma.bankConnection.findUnique({
      where: {
        id: connectionId,
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

    // Sync transactions from Plaid
    const plaidTransactions = await syncTransactions(accessToken)

    // Get accounts for this connection
    const accounts = await prisma.account.findMany({
      where: {
        bankConnectionId: connectionId,
      },
    })

    const accountMap = new Map(
      accounts.map((account) => [account.plaidAccountId, account.id])
    )

    // Create transactions in database
    const transactions = await Promise.all(
      plaidTransactions.map(async (plaidTxn) => {
        const accountId = accountMap.get(plaidTxn.accountId)

        if (!accountId) {
          return null
        }

        // Check if transaction already exists
        const existing = await prisma.transaction.findFirst({
          where: {
            externalId: plaidTxn.transactionId,
          },
        })

        if (existing) {
          return existing
        }

        // Create new transaction
        return prisma.transaction.create({
          data: {
            accountId,
            description: plaidTxn.name,
            merchant: plaidTxn.merchantName || plaidTxn.name,
            amount: new Decimal(Math.abs(plaidTxn.amount)),
            currency: plaidTxn.currency,
            type: plaidTxn.amount < 0 ? TxnType.INCOME : TxnType.EXPENSE,
            postedAt: new Date(plaidTxn.date),
            isPending: plaidTxn.pending,
            externalId: plaidTxn.transactionId,
            source: 'BANK_API',
          },
        })
      })
    )

    const validTransactions = transactions.filter((txn) => txn !== null)

    // Update connection last sync time
    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date() },
    })

    return NextResponse.json(
      {
        synced: validTransactions.length,
        transactions: validTransactions.map((txn) => ({
          id: txn!.id,
          description: txn!.description,
          amount: txn!.amount,
          date: txn!.postedAt,
        })),
      },
      {
        headers: getRateLimitHeaders('EXPENSIVE', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error in sync POST route:', error)
    return NextResponse.json(
      { error: 'Failed to sync transactions' },
      { status: 500 }
    )
  }
}
