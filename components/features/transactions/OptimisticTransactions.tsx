'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Edit, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction, Account, Category } from '@prisma/client'

interface TransactionWithRelations extends Transaction {
  account: Pick<Account, 'id' | 'name' | 'currency'>
  category: Pick<Category, 'id' | 'name'> | null
}

interface OptimisticTransactionsProps {
  initialTransactions: TransactionWithRelations[]
  accountId?: string
  accounts: Array<Pick<Account, 'id' | 'name' | 'currency'>>
  categories: Array<Pick<Category, 'id' | 'name' | 'type'>>
}

export function OptimisticTransactions({
  initialTransactions,
  accountId,
  accounts,
  categories,
}: OptimisticTransactionsProps) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)

  // Optimistic state for instant UI updates
  const [optimisticTransactions, addOptimisticTransaction] = useOptimistic(
    initialTransactions,
    (state, newTransaction: TransactionWithRelations | { id: string; action: 'delete' }) => {
      if ('action' in newTransaction && newTransaction.action === 'delete') {
        return state.filter((t) => t.id !== newTransaction.id)
      }
      return [newTransaction as TransactionWithRelations, ...state]
    }
  )

  async function handleCreateTransaction(formData: FormData) {
    const selectedAccountId = formData.get('accountId') as string
    const account = accounts.find((a) => a.id === selectedAccountId)!
    const selectedCategoryId = formData.get('categoryId') as string
    const category = categories.find((c) => c.id === selectedCategoryId) || null

    // Optimistic transaction (temporary ID)
    const optimisticTxn: TransactionWithRelations = {
      id: `temp-${Date.now()}`,
      accountId: selectedAccountId,
      account: {
        id: account.id,
        name: account.name,
        currency: account.currency,
      },
      postedAt: new Date(),
      amount: formData.get('amount') as any,
      currency: account.currency,
      description: formData.get('description') as string,
      merchant: formData.get('merchant') as string | null,
      type: formData.get('type') as any,
      categoryId: selectedCategoryId || null,
      category: category
        ? { id: category.id, name: category.name }
        : null,
      source: 'MANUAL' as any,
      reviewStatus: 'NONE' as any,
      isPending: false,
      installmentPlanId: null,
      statementDocumentId: null,
      externalId: null,
      raw: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Add optimistically
    addOptimisticTransaction(optimisticTxn)
    setShowForm(false)

    // Actually create transaction
    startTransition(async () => {
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: selectedAccountId,
            amount: parseFloat(formData.get('amount') as string),
            description: formData.get('description'),
            merchant: formData.get('merchant') || undefined,
            type: formData.get('type'),
            categoryId: selectedCategoryId || undefined,
            postedAt: new Date().toISOString(),
          }),
        })

        if (!response.ok) throw new Error('Failed to create transaction')

        // Refresh the page to get real data
        window.location.reload()
      } catch (error) {
        console.error('Failed to create transaction:', error)
        // TODO: Show error toast and revert optimistic update
      }
    })
  }

  async function handleDeleteTransaction(id: string) {
    // Optimistic delete
    addOptimisticTransaction({ id, action: 'delete' } as any)

    startTransition(async () => {
      try {
        const response = await fetch(`/api/transactions/${id}`, {
          method: 'DELETE',
        })

        if (!response.ok) throw new Error('Failed to delete transaction')

        // Success - optimistic update already done
      } catch (error) {
        console.error('Failed to delete transaction:', error)
        // TODO: Revert optimistic update
        window.location.reload()
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Quick Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Transactions</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Quick Add Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Transaction</CardTitle>
            <CardDescription>Add a new transaction instantly</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCreateTransaction(new FormData(e.currentTarget))
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select name="type" defaultValue="EXPENSE" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Income</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountId">Account</Label>
                  <Select name="accountId" defaultValue={accountId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select name="categoryId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Coffee at Starbucks"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="merchant">Merchant (optional)</Label>
                  <Input
                    id="merchant"
                    name="merchant"
                    placeholder="Starbucks"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Creating...' : 'Create Transaction'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Transaction List with Optimistic Updates */}
      <div className="space-y-2">
        {optimisticTransactions.length === 0 ? (
          <Card>
            <CardContent className="flex h-32 items-center justify-center text-muted-foreground">
              No transactions yet. Add your first one!
            </CardContent>
          </Card>
        ) : (
          optimisticTransactions.map((transaction) => (
            <Card
              key={transaction.id}
              className={`transition-all ${
                transaction.id.startsWith('temp-')
                  ? 'opacity-60 animate-pulse'
                  : 'opacity-100'
              }`}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      transaction.type === 'INCOME'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {transaction.type === 'INCOME' ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {transaction.merchant && `${transaction.merchant} • `}
                      {transaction.account.name} • {formatDate(transaction.postedAt)}
                      {transaction.category && ` • ${transaction.category.name}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={`text-lg font-semibold ${
                      transaction.type === 'INCOME'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'INCOME' ? '+' : '-'}
                    {formatCurrency(
                      Math.abs(Number(transaction.amount)),
                      transaction.currency
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        // TODO: Implement edit
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTransaction(transaction.id)}
                      disabled={transaction.id.startsWith('temp-')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {isPending && (
        <div className="text-center text-sm text-muted-foreground">
          Syncing with server...
        </div>
      )}
    </div>
  )
}
