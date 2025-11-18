'use client'

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Wallet, CreditCard, TrendingUp, Building } from 'lucide-react'
import type { Account, AccountType } from '@prisma/client'
import { ImportDataDialog } from '@/components/features/import/ImportDataDialog'

interface AccountCardWithActionsProps {
  account: Account
  onImportComplete?: () => void
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

export function AccountCardWithActions({
  account,
  onImportComplete,
}: AccountCardWithActionsProps) {
  const Icon = accountIcons[account.type]

  const handleImportComplete = (count: number) => {
    console.log(`Successfully imported ${count} transactions`)
    onImportComplete?.()
  }

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
            {formatCurrency(parseFloat(account.balance.toString()), account.currency)}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {account.type.replace('_', ' ')}
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
      <CardFooter>
        <ImportDataDialog
          accountId={account.id}
          defaultCurrency={account.currency}
          onImportComplete={handleImportComplete}
        />
      </CardFooter>
    </Card>
  )
}
