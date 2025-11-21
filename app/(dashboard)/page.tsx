import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { db } from '@/lib/prisma'
import { Decimal } from 'decimal.js'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { NetWorthChart } from '@/components/features/networth/NetWorthChart'

async function getDashboardData(userId: string) {
  // Fetch all accounts for the user
  const accounts = await db.account.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      type: true,
      balance: true,
      currency: true,
    },
  })

  // Fetch recent transactions (last 10)
  const recentTransactions = await db.transaction.findMany({
    where: {
      account: {
        userId,
      },
    },
    select: {
      id: true,
      description: true,
      merchant: true,
      amount: true,
      type: true,
      postedAt: true,
      account: {
        select: {
          name: true,
          currency: true,
        },
      },
    },
    orderBy: { postedAt: 'desc' },
    take: 10,
  })

  // Calculate stats
  let assets = new Decimal(0)
  let liabilities = new Decimal(0)
  let receivables = new Decimal(0)

  accounts.forEach((account) => {
    const balance = new Decimal(account.balance.toString())

    switch (account.type) {
      case 'DEPOSIT':
      case 'INVESTMENT':
      case 'CASH':
        assets = assets.plus(balance)
        break
      case 'CREDIT_CARD':
      case 'LOAN':
        liabilities = liabilities.plus(balance.abs())
        break
      case 'RECEIVABLE':
        receivables = receivables.plus(balance)
        break
    }
  })

  const netWorth = assets.minus(liabilities).plus(receivables)

  return {
    accounts,
    recentTransactions,
    stats: {
      netWorth: netWorth.toNumber(),
      assets: assets.toNumber(),
      liabilities: liabilities.toNumber(),
      receivables: receivables.toNumber(),
    },
  }
}

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const { accounts, recentTransactions, stats } = await getDashboardData(userId)

  // Empty state
  if (accounts.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Welcome to Income Tracker!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Get started by creating your first account or connecting a bank account.
            </p>
            <div className="flex gap-2">
              <Link
                href="/accounts"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Create Account
              </Link>
              <Link
                href="/bank-connections"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Connect Bank
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const baseCurrency = process.env.NEXT_PUBLIC_BASE_CURRENCY || 'TRY'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: baseCurrency,
              }).format(stats.netWorth)}
            </div>
            <p className="text-xs text-muted-foreground">Assets - Liabilities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: baseCurrency,
              }).format(stats.assets)}
            </div>
            <p className="text-xs text-muted-foreground">Deposits + Investments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: baseCurrency,
              }).format(stats.liabilities)}
            </div>
            <p className="text-xs text-muted-foreground">Credit cards + Loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receivables</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: baseCurrency,
              }).format(stats.receivables)}
            </div>
            <p className="text-xs text-muted-foreground">Money owed to you</p>
          </CardContent>
        </Card>
      </div>

      {/* Net Worth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <NetWorthChart />
        </CardContent>
      </Card>

      {/* Accounts and Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accounts.map((account) => {
                const balance = new Decimal(account.balance.toString())
                const isPositive = balance.greaterThan(0)

                return (
                  <div key={account.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {account.type.toLowerCase().replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {new Intl.NumberFormat('tr-TR', {
                          style: 'currency',
                          currency: account.currency,
                        }).format(balance.toNumber())}
                      </p>
                    </div>
                  </div>
                )
              })}
              <Link
                href="/accounts"
                className="flex items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground hover:border-solid hover:bg-accent"
              >
                View all accounts
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-center text-muted-foreground">
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.slice(0, 5).map((txn) => {
                  const amount = new Decimal(txn.amount.toString())
                  const isIncome = txn.type === 'INCOME'

                  return (
                    <div key={txn.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            isIncome ? 'bg-green-100' : 'bg-red-100'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{txn.merchant || txn.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(txn.postedAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          {isIncome ? '+' : '-'}
                          {new Intl.NumberFormat('tr-TR', {
                            style: 'currency',
                            currency: txn.account.currency,
                          }).format(amount.abs().toNumber())}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <Link
                  href="/transactions"
                  className="flex items-center justify-center gap-2 rounded-md border border-dashed p-2 text-sm text-muted-foreground hover:border-solid hover:bg-accent"
                >
                  View all transactions
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
