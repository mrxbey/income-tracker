'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Plus,
  Calendar,
  TrendingDown,
  Loader2,
  Trash2,
  Edit,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Period } from '@prisma/client'

interface FixedExpense {
  id: string
  name: string
  amount: string | number
  currency: string
  period: Period
  interval?: number | null
  nextDueAt: Date | string
  isActive: boolean
  lifeDomain?: string | null
  countryCode?: string | null
  account?: {
    id: string
    name: string
    currency: string
  } | null
  category?: {
    id: string
    name: string
    color?: string | null
  } | null
  createdAt: Date | string
  updatedAt: Date | string
}

interface FormData {
  name: string
  amount: string
  currency: string
  period: Period
  interval?: string
  nextDueAt: string
  accountId?: string
  categoryId?: string
  lifeDomain?: string
  countryCode?: string
}

const periodLabels: Record<Period, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
  CUSTOM: 'Custom',
}

export function FixedExpenseList() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    name: '',
    amount: '',
    currency: 'TRY',
    period: 'MONTHLY',
    nextDueAt: new Date().toISOString().split('T')[0] || '',
  })

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/fixed-expenses')
      if (!response.ok) throw new Error('Failed to fetch fixed expenses')
      const data = await response.json()
      setExpenses(data.fixedExpenses || [])
    } catch (err) {
      console.error('Error fetching fixed expenses:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  const handleOpenDialog = (expense?: FixedExpense) => {
    if (expense) {
      setEditingExpense(expense)
      setFormData({
        name: expense.name,
        amount: expense.amount.toString(),
        currency: expense.currency,
        period: expense.period,
        interval: expense.interval?.toString() || '',
        nextDueAt:
          typeof expense.nextDueAt === 'string'
            ? expense.nextDueAt.split('T')[0] || ''
            : new Date(expense.nextDueAt).toISOString().split('T')[0] || '',
        accountId: expense.account?.id || '',
        categoryId: expense.category?.id || '',
        lifeDomain: expense.lifeDomain || '',
        countryCode: expense.countryCode || '',
      })
    } else {
      setEditingExpense(null)
      setFormData({
        name: '',
        amount: '',
        currency: 'TRY',
        period: 'MONTHLY',
        nextDueAt: new Date().toISOString().split('T')[0] || '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingExpense(null)
    setFormData({
      name: '',
      amount: '',
      currency: 'TRY',
      period: 'MONTHLY',
      nextDueAt: new Date().toISOString().split('T')[0] || '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        period: formData.period,
        ...(formData.interval && { interval: parseInt(formData.interval) }),
        nextDueAt: formData.nextDueAt,
        ...(formData.accountId && { accountId: formData.accountId }),
        ...(formData.categoryId && { categoryId: formData.categoryId }),
        ...(formData.lifeDomain && { lifeDomain: formData.lifeDomain }),
        ...(formData.countryCode && { countryCode: formData.countryCode }),
      }

      const url = editingExpense
        ? `/api/fixed-expenses/${editingExpense.id}`
        : '/api/fixed-expenses'
      const method = editingExpense ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save expense')
      }

      await fetchExpenses()
      handleCloseDialog()
    } catch (err) {
      console.error('Error saving expense:', err)
      setError(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fixed expense?')) return

    try {
      const response = await fetch(`/api/fixed-expenses/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete expense')

      await fetchExpenses()
    } catch (err) {
      console.error('Error deleting expense:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete expense')
    }
  }

  const calculateNextOccurrence = (date: Date | string, period: Period, interval?: number | null) => {
    const nextDate = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil
  }

  const getMonthlyEquivalent = (amount: number, period: Period): number => {
    switch (period) {
      case 'WEEKLY':
        return amount * 4.33
      case 'MONTHLY':
        return amount
      case 'QUARTERLY':
        return amount / 3
      case 'YEARLY':
        return amount / 12
      default:
        return amount
    }
  }

  const totalMonthlyExpenses = expenses
    .filter((e) => e.isActive)
    .reduce(
      (sum, expense) =>
        sum + getMonthlyEquivalent(Number(expense.amount), expense.period),
      0
    )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fixed Expenses</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage recurring bills and subscriptions
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingExpense ? 'Edit Fixed Expense' : 'Add Fixed Expense'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingExpense
                      ? 'Update the details of your recurring expense'
                      : 'Add a new recurring expense to track'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Netflix, Rent, Gym"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency *</Label>
                      <Input
                        id="currency"
                        value={formData.currency}
                        onChange={(e) =>
                          setFormData({ ...formData, currency: e.target.value })
                        }
                        placeholder="TRY"
                        maxLength={3}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="period">Frequency *</Label>
                    <Select
                      value={formData.period}
                      onValueChange={(value) =>
                        setFormData({ ...formData, period: value as Period })
                      }
                    >
                      <SelectTrigger id="period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                        <SelectItem value="CUSTOM">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.period === 'CUSTOM' && (
                    <div>
                      <Label htmlFor="interval">Interval (days)</Label>
                      <Input
                        id="interval"
                        type="number"
                        value={formData.interval}
                        onChange={(e) =>
                          setFormData({ ...formData, interval: e.target.value })
                        }
                        placeholder="e.g., 14 for bi-weekly"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="nextDueAt">Next Due Date *</Label>
                    <Input
                      id="nextDueAt"
                      type="date"
                      value={formData.nextDueAt}
                      onChange={(e) =>
                        setFormData({ ...formData, nextDueAt: e.target.value })
                      }
                      required
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingExpense ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground">Total Active</div>
              <div className="text-2xl font-bold">
                {expenses.filter((e) => e.isActive).length}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Monthly Total</div>
              <div className="text-2xl font-bold">
                {formatCurrency(totalMonthlyExpenses, 'TRY')}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Yearly Total</div>
              <div className="text-2xl font-bold">
                {formatCurrency(totalMonthlyExpenses * 12, 'TRY')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Expenses List */}
      <div className="space-y-3">
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">No fixed expenses yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add your recurring bills and subscriptions to track them
              </p>
            </CardContent>
          </Card>
        ) : (
          expenses.map((expense) => {
            const daysUntil = calculateNextOccurrence(
              expense.nextDueAt,
              expense.period,
              expense.interval
            )
            const isOverdue = daysUntil < 0
            const isDueSoon = daysUntil >= 0 && daysUntil <= 7

            return (
              <Card
                key={expense.id}
                className={`hover:shadow-md transition-shadow ${
                  !expense.isActive ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{expense.name}</h3>
                        {!expense.isActive && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-4 text-sm">
                          <Badge variant="outline">
                            {periodLabels[expense.period]}
                          </Badge>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Next due: </span>
                            <span
                              className={`font-medium ${
                                isOverdue
                                  ? 'text-red-600'
                                  : isDueSoon
                                    ? 'text-amber-600'
                                    : ''
                              }`}
                            >
                              {typeof expense.nextDueAt === 'string'
                                ? new Date(expense.nextDueAt).toLocaleDateString()
                                : expense.nextDueAt.toLocaleDateString()}
                              {daysUntil >= 0 && daysUntil <= 30 && (
                                <span className="ml-1">({daysUntil} days)</span>
                              )}
                              {isOverdue && (
                                <span className="ml-1">
                                  ({Math.abs(daysUntil)} days overdue)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {expense.category && (
                          <div className="text-sm text-muted-foreground">
                            Category: {expense.category.name}
                          </div>
                        )}

                        {expense.account && (
                          <div className="text-sm text-muted-foreground">
                            Account: {expense.account.name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {formatCurrency(
                            Number(expense.amount),
                            expense.currency
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(
                            getMonthlyEquivalent(
                              Number(expense.amount),
                              expense.period
                            ),
                            expense.currency
                          )}
                          /mo
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
