import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { exchangePublicToken, getAccounts } from '@/lib/services/plaid-service'
import { db as prisma } from '@/lib/prisma'
import { AccountType } from '@prisma/client'
import { encrypt } from '@/lib/crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Map Plaid account types to our AccountType enum
function mapPlaidAccountType(plaidType: string): AccountType {
  const lowerType = plaidType.toLowerCase()
  if (lowerType.includes('credit')) return 'CREDIT_CARD'
  if (lowerType.includes('loan')) return 'LOAN'
  if (lowerType.includes('investment') || lowerType.includes('brokerage')) return 'INVESTMENT'
  return 'DEPOSIT' // Default to deposit for checking/savings
}

/**
 * POST /api/plaid/exchange-token
 * Exchange a Plaid public token for an access token and create bank accounts
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { publicToken } = body

    if (!publicToken) {
      return NextResponse.json(
        { error: 'Missing public token' },
        { status: 400 }
      )
    }

    // Exchange public token for access token
    const metadata = await exchangePublicToken(publicToken)

    // Get accounts from Plaid
    const plaidAccounts = await getAccounts(metadata.accessToken)

    // Create bank connection in database
    // Encrypt access token before storing for security
    const encryptedAccessToken = encrypt(metadata.accessToken)

    const connection = await prisma.bankConnection.create({
      data: {
        userId,
        institutionId: metadata.institutionId,
        institutionName: metadata.institutionName,
        accessToken: encryptedAccessToken,
        itemId: metadata.itemId,
        status: 'ACTIVE',
      },
    })

    // Create accounts in database
    const accounts = await Promise.all(
      plaidAccounts.map((plaidAccount) =>
        prisma.account.create({
          data: {
            userId,
            name: `${metadata.institutionName} ${plaidAccount.name}`,
            type: mapPlaidAccountType(plaidAccount.type),
            currency: plaidAccount.balances.currency,
            countryCode: 'US', // Default, could be enhanced with metadata
            regionGroup: 'US',
            balance: plaidAccount.balances.current || 0,
            bankConnectionId: connection.id,
            plaidAccountId: plaidAccount.accountId,
          },
        })
      )
    )

    return NextResponse.json({
      connection: {
        id: connection.id,
        institutionName: connection.institutionName,
      },
      accounts: accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
      })),
    })
  } catch (error) {
    console.error('Error in exchange-token POST route:', error)
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    )
  }
}
