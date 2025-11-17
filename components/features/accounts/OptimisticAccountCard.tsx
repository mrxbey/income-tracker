'use client'

import { useOptimistic } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Wallet, CreditCard, TrendingUp, Building } from 'lucide-react'
import type { Account, AccountType } from '@prisma/client'

interface OptimisticAccountCardProps {
  account: Account
  showOptimisticBalance?: boolean
}

const accountIcons: Record<AccountType, React.ComponentType<{ className?: string }>> = {
  DEPOSIT: Wallet,
  CREDIT_CARD: CreditCard,
  INVESTMENT: TrendingUp,
  LOAN: Building,
  CASH: Wallet,
  RECEIVABLE: Wallet,
  OTHER: Wallet,
}

const accountColors: Record<AccountType, string> = {
  DEPOSIT: 'bg-blue-100 text-blue-600',
  CREDIT_CARD: 'bg-purple-100 text-purple-600',
  INVESTMENT: 'bg-green-100 text-green-600',
  LOAN: 'bg-red-100 text-red-600',
  CASH: 'bg-gray-100 text-gray-600',
  RECEIVABLE: 'bg-yellow-100 text-yellow-600',
  OTHER: 'bg-gray-100 text-gray-600',
}

export function OptimisticAccountCard({
  account,
  showOptimisticBalance = false,
}: OptimisticAccountCardProps) {
  const [optimisticBalance, updateBalance] = useOptimistic(
    account.balance.toString(),
    (state, newAmount: number) => {
      const currentBalance = parseFloat(state)
      return (currentBalance + newAmount).toString()
    }
  )

  const Icon = accountIcons[account.type]
  const displayBalance = showOptimisticBalance ? optimisticBalance : account.balance.toString()

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
        <div className={`rounded-full p-2 ${accountColors[account.type]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {formatCurrency(parseFloat(displayBalance), account.currency)}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {account.type.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {account.regionGroup}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {account.currency}
            </Badge>
          </div>
          {!account.isActive && (
            <Badge variant="destructive" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Hook to update balance from parent component
export function useAccountBalance(accountId: string) {
  // This would be used in parent to trigger optimistic updates
  return {
    updateBalance: (amount: number) => {
      // Emit event or use context to update specific account
      window.dispatchEvent(
        new CustomEvent('update-account-balance', {
          detail: { accountId, amount },
        })
      )
    },
  }
}
