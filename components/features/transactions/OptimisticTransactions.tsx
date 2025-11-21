'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, Edit, Plus, TrendingUp, TrendingDown, Split } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction, Account, Category, TxnType, TransactionSource, ReviewStatus } from '@prisma/client'
import { z } from 'zod'
import { SplitTransactionEditor } from './SplitTransactionEditor'

// Form validation schema
const transactionFormSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  amount: z.string().min(1, 'Amount is required').transform((val) => parseFloat(val)),
  description: z.string().min(1, 'Description is required'),
  merchant: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER'] as const),
  categoryId: z.string().optional(),
})

type TransactionFormData = z.infer<typeof transactionFormSchema>

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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [splittingTransaction, setSplittingTransaction] = useState<TransactionWithRelations | null>(null)

  // Define optimistic action types
  type OptimisticAction =
    | { type: 'add'; transaction: TransactionWithRelations }
    | { type: 'delete'; id: string }

  // Optimistic state for instant UI updates
  const [optimisticTransactions, addOptimisticTransaction] = useOptimistic(
    initialTransactions,
    (state, action: OptimisticAction) => {
      if (action.type === 'delete') {
        return state.filter((t) => t.id !== action.id)
      }
      return [action.transaction, ...state]
    }
  )

  async function handleCreateTransaction(formData: FormData) {
    try {
      // Validate form data with Zod
      const rawData = {
        accountId: formData.get('accountId'),
        amount: formData.get('amount'),
        description: formData.get('description'),
        merchant: formData.get('merchant') || undefined,
        type: formData.get('type'),
        categoryId: formData.get('categoryId') || undefined,
      }

      const validated = transactionFormSchema.parse(rawData)

      const account = accounts.find((a) => a.id === validated.accountId)
      if (!account) {
        throw new Error('Selected account not found')
      }

      const category = validated.categoryId
        ? categories.find((c) => c.id === validated.categoryId) || null
        : null

      // Optimistic transaction (temporary ID)
      const optimisticTxn: TransactionWithRelations = {
        id: `temp-${Date.now()}`,
        accountId: validated.accountId,
        account: {
          id: account.id,
          name: account.name,
          currency: account.currency,
        },
        postedAt: new Date(),
        amount: validated.amount.toString(),
        currency: account.currency,
        description: validated.description,
        merchant: validated.merchant || null,
        type: validated.type as TxnType,
        categoryId: validated.categoryId || null,
        category: category
          ? { id: category.id, name: category.name }
          : null,
        source: 'MANUAL' as TransactionSource,
        reviewStatus: 'NONE' as ReviewStatus,
        isPending: false,
        installmentPlanId: null,
        statementDocumentId: null,
        externalId: null,
        raw: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Add optimistically
      addOptimisticTransaction({ type: 'add', transaction: optimisticTxn })
      setShowForm(false)

      // Actually create transaction
      startTransition(async () => {
        try {
          const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: validated.accountId,
              amount: validated.amount,
              description: validated.description,
              merchant: validated.merchant || undefined,
              type: validated.type,
              categoryId: validated.categoryId || undefined,
              postedAt: new Date().toISOString(),
            }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to create transaction')
          }

          // Refresh server components to get real data (without full page reload)
          router.refresh()
          setError(null)
        } catch (err) {
          console.error('Failed to create transaction:', err)
          setError(err instanceof Error ? err.message : 'Failed to create transaction')
          // Router refresh will revert optimistic update by fetching latest data
          router.refresh()
        }
      })
    } catch (validationError) {
      // Handle validation errors
      if (validationError instanceof z.ZodError) {
        const errorMessages = validationError.errors.map(e => e.message).join(', ')
        setError(`Validation error: ${errorMessages}`)
      } else {
        setError(validationError instanceof Error ? validationError.message : 'Failed to create transaction')
      }
    }
  }

  async function handleDeleteTransaction(id: string) {
    // Optimistic delete
    addOptimisticTransaction({ type: 'delete', id })

    startTransition(async () => {
      try {
        const response = await fetch(`/api/transactions/${id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete transaction')
        }

        // Success - refresh to confirm deletion
        router.refresh()
        setError(null)
      } catch (err) {
        console.error('Failed to delete transaction:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete transaction')
        // Router refresh will revert optimistic update by fetching latest data
        router.refresh()
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

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-destructive">Error</h3>
              <p className="text-sm text-destructive/90 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-destructive hover:text-destructive/80"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
                      onClick={() => setSplittingTransaction(transaction)}
                      disabled={transaction.id.startsWith('temp-')}
                      title="Split transaction"
                    >
                      <Split className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        // TODO: Implement edit
                      }}
                      title="Edit transaction"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTransaction(transaction.id)}
                      disabled={transaction.id.startsWith('temp-')}
                      title="Delete transaction"
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

      {/* Split Transaction Dialog */}
      <Dialog open={!!splittingTransaction} onOpenChange={() => setSplittingTransaction(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Split Transaction</DialogTitle>
            <DialogDescription>
              Divide this transaction across multiple categories
            </DialogDescription>
          </DialogHeader>
          {splittingTransaction && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{splittingTransaction.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {splittingTransaction.merchant && `${splittingTransaction.merchant} • `}
                      {splittingTransaction.account.name} • {formatDate(splittingTransaction.postedAt)}
                    </div>
                  </div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(
                      Math.abs(Number(splittingTransaction.amount)),
                      splittingTransaction.currency
                    )}
                  </div>
                </div>
              </div>

              <SplitTransactionEditor
                transactionId={splittingTransaction.id}
                transactionAmount={Number(splittingTransaction.amount)}
                currency={splittingTransaction.currency}
                categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                onComplete={() => {
                  setSplittingTransaction(null)
                  router.refresh()
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
