import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AddBankAccountDialog } from '@/components/features/accounts/AddBankAccountDialog'
import { AccountsList } from '@/components/features/accounts/AccountsList'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

export default async function AccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Accounts</h2>
          <p className="text-muted-foreground">Manage your bank accounts, cards, and investments</p>
        </div>
        <AddBankAccountDialog />
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <AccountsList />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Learn how to manage your accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>1. Add accounts:</strong> Click "Add Account" to create a new bank account, credit card, or investment account
            </p>
            <p>
              <strong>2. Import transactions:</strong> Use the "Import CSV/JSON" button on each account to bulk import transactions
            </p>
            <p>
              <strong>3. Track balances:</strong> Your account balances update automatically as you add transactions
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
