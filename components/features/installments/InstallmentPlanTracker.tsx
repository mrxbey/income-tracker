'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  CreditCard,
  Calendar,
  TrendingDown,
  Loader2,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Account {
  id: string
  name: string
  currency: string
}

interface Transaction {
  id: string
  amount: string | number
  postedAt: Date | string
  description: string
}

interface InstallmentPlan {
  id: string
  cardAccountId: string
  cardAccount?: Account
  merchant?: string | null
  description?: string | null
  totalAmount: string | number
  numInstallments: number
  installmentAmount: string | number
  firstDueAt: Date | string
  frequencyDays: number
  remainingInstallments: number
  source: string
  confidence: number
  transactions: Transaction[]
  createdAt: Date | string
  updatedAt: Date | string
}

interface FormData {
  cardAccountId: string
  merchant?: string
  description?: string
  totalAmount: string
  numInstallments: string
  installmentAmount: string
  firstDueAt: string
  frequencyDays: string
}

export function InstallmentPlanTracker() {
  const [plans, setPlans] = useState<InstallmentPlan[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<InstallmentPlan | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    cardAccountId: '',
    totalAmount: '',
    numInstallments: '12',
    installmentAmount: '',
    firstDueAt: new Date().toISOString().split('T')[0] || '',
    frequencyDays: '30',
  })

  const fetchPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/installment-plans')
      if (!response.ok) throw new Error('Failed to fetch installment plans')
      const data = await response.json()
      setPlans(data.installmentPlans || [])
    } catch (err) {
      console.error('Error fetching installment plans:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch plans')
    } finally {
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (!response.ok) throw new Error('Failed to fetch accounts')
      const data = await response.json()
      // Filter for credit card accounts
      const creditCards = (data.accounts || []).filter(
        (acc: any) => acc.type === 'CREDIT_CARD'
      )
      setAccounts(creditCards)
    } catch (err) {
      console.error('Error fetching accounts:', err)
    }
  }

  useEffect(() => {
    fetchPlans()
    fetchAccounts()
  }, [])

  const handleOpenDialog = (plan?: InstallmentPlan) => {
    if (plan) {
      setEditingPlan(plan)
      setFormData({
        cardAccountId: plan.cardAccountId,
        merchant: plan.merchant || '',
        description: plan.description || '',
        totalAmount: plan.totalAmount.toString(),
        numInstallments: plan.numInstallments.toString(),
        installmentAmount: plan.installmentAmount.toString(),
        firstDueAt:
          typeof plan.firstDueAt === 'string'
            ? plan.firstDueAt.split('T')[0] || ''
            : new Date(plan.firstDueAt).toISOString().split('T')[0] || '',
        frequencyDays: plan.frequencyDays.toString(),
      })
    } else {
      setEditingPlan(null)
      setFormData({
        cardAccountId: accounts[0]?.id || '',
        totalAmount: '',
        numInstallments: '12',
        installmentAmount: '',
        firstDueAt: new Date().toISOString().split('T')[0] || '',
        frequencyDays: '30',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingPlan(null)
  }

  const calculateInstallmentAmount = () => {
    const total = parseFloat(formData.totalAmount)
    const num = parseInt(formData.numInstallments)
    if (!isNaN(total) && !isNaN(num) && num > 0) {
      const amount = (total / num).toFixed(2)
      setFormData({ ...formData, installmentAmount: amount })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        cardAccountId: formData.cardAccountId,
        merchant: formData.merchant || undefined,
        description: formData.description || undefined,
        totalAmount: parseFloat(formData.totalAmount),
        numInstallments: parseInt(formData.numInstallments),
        installmentAmount: parseFloat(formData.installmentAmount),
        firstDueAt: formData.firstDueAt,
        frequencyDays: parseInt(formData.frequencyDays),
        source: 'MANUAL',
      }

      const url = editingPlan ? `/api/installment-plans/${editingPlan.id}` : '/api/installment-plans'
      const method = editingPlan ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save installment plan')
      }

      await fetchPlans()
      handleCloseDialog()
    } catch (err) {
      console.error('Error saving installment plan:', err)
      setError(err instanceof Error ? err.message : 'Failed to save plan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this installment plan?')) return

    try {
      const response = await fetch(`/api/installment-plans/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete plan')

      await fetchPlans()
    } catch (err) {
      console.error('Error deleting plan:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete plan')
    }
  }

  const calculateNextDueDate = (firstDueAt: Date | string, paid: number, frequencyDays: number) => {
    const firstDate = typeof firstDueAt === 'string' ? new Date(firstDueAt) : firstDueAt
    const nextDate = new Date(firstDate)
    nextDate.setDate(nextDate.getDate() + paid * frequencyDays)
    return nextDate
  }

  const calculateProgress = (total: number, remaining: number) => {
    return ((total - remaining) / total) * 100
  }

  const totalRemaining = plans.reduce(
    (sum, plan) => sum + Number(plan.installmentAmount) * plan.remainingInstallments,
    0
  )

  const totalPaid = plans.reduce((sum, plan) => {
    const paidCount = plan.numInstallments - plan.remainingInstallments
    return sum + Number(plan.installmentAmount) * paidCount
  }, 0)

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
              <CardTitle>Installment Plans</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track credit card installment payments
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} disabled={accounts.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingPlan ? 'Edit Installment Plan' : 'Add Installment Plan'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPlan
                      ? 'Update the installment plan details'
                      : 'Add a new credit card installment plan to track'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="cardAccountId">Credit Card *</Label>
                    <Select
                      value={formData.cardAccountId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, cardAccountId: value })
                      }
                    >
                      <SelectTrigger id="cardAccountId">
                        <SelectValue placeholder="Select credit card" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="merchant">Merchant</Label>
                    <Input
                      id="merchant"
                      value={formData.merchant}
                      onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                      placeholder="e.g., Apple Store, Amazon"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., iPhone 15 Pro"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="totalAmount">Total Amount *</Label>
                      <Input
                        id="totalAmount"
                        type="number"
                        step="0.01"
                        value={formData.totalAmount}
                        onChange={(e) => {
                          setFormData({ ...formData, totalAmount: e.target.value })
                        }}
                        onBlur={calculateInstallmentAmount}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="numInstallments">Installments *</Label>
                      <Input
                        id="numInstallments"
                        type="number"
                        min="2"
                        value={formData.numInstallments}
                        onChange={(e) => {
                          setFormData({ ...formData, numInstallments: e.target.value })
                        }}
                        onBlur={calculateInstallmentAmount}
                        placeholder="12"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="installmentAmount">Amount per Installment *</Label>
                    <Input
                      id="installmentAmount"
                      type="number"
                      step="0.01"
                      value={formData.installmentAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, installmentAmount: e.target.value })
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstDueAt">First Payment Date *</Label>
                      <Input
                        id="firstDueAt"
                        type="date"
                        value={formData.firstDueAt}
                        onChange={(e) => setFormData({ ...formData, firstDueAt: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="frequencyDays">Frequency (days) *</Label>
                      <Input
                        id="frequencyDays"
                        type="number"
                        min="1"
                        value={formData.frequencyDays}
                        onChange={(e) =>
                          setFormData({ ...formData, frequencyDays: e.target.value })
                        }
                        placeholder="30"
                        required
                      />
                    </div>
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
                      {editingPlan ? 'Update' : 'Create'}
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
              <div className="text-sm text-muted-foreground">Active Plans</div>
              <div className="text-2xl font-bold">{plans.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <div className="text-2xl font-bold">{formatCurrency(totalPaid, 'TRY')}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Remaining</div>
              <div className="text-2xl font-bold">{formatCurrency(totalRemaining, 'TRY')}</div>
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

      {/* Installment Plans List */}
      <div className="space-y-4">
        {plans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">No installment plans yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                {accounts.length === 0
                  ? 'Add a credit card account first to track installment plans'
                  : 'Add your credit card installment purchases to track them'}
              </p>
            </CardContent>
          </Card>
        ) : (
          plans.map((plan) => {
            const paidInstallments = plan.numInstallments - plan.remainingInstallments
            const progress = calculateProgress(plan.numInstallments, plan.remainingInstallments)
            const nextDue = calculateNextDueDate(
              plan.firstDueAt,
              paidInstallments,
              plan.frequencyDays
            )
            const isCompleted = plan.remainingInstallments === 0
            const daysUntilNext = Math.ceil(
              (nextDue.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )

            return (
              <Card key={plan.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {plan.merchant || plan.description || 'Installment Plan'}
                          </h3>
                          {isCompleted && (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4" />
                            {plan.cardAccount?.name}
                          </div>
                          {!isCompleted && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Next due: {nextDue.toLocaleDateString()}
                              {daysUntilNext >= 0 && daysUntilNext <= 7 && (
                                <span className="ml-1 text-amber-600">({daysUntilNext} days)</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {formatCurrency(
                              Number(plan.installmentAmount),
                              plan.cardAccount?.currency || 'TRY'
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">per month</div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {paidInstallments} / {plan.numInstallments} paid
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                      <div className="text-sm">
                        <div className="text-muted-foreground">Total Amount</div>
                        <div className="font-medium">
                          {formatCurrency(
                            Number(plan.totalAmount),
                            plan.cardAccount?.currency || 'TRY'
                          )}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="text-muted-foreground">Paid</div>
                        <div className="font-medium text-green-600">
                          {formatCurrency(
                            Number(plan.installmentAmount) * paidInstallments,
                            plan.cardAccount?.currency || 'TRY'
                          )}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="text-muted-foreground">Remaining</div>
                        <div className="font-medium text-orange-600">
                          {formatCurrency(
                            Number(plan.installmentAmount) * plan.remainingInstallments,
                            plan.cardAccount?.currency || 'TRY'
                          )}
                        </div>
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
