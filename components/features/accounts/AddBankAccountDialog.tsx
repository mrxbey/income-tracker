'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { Plus, Loader2, AlertCircle, Building2, CreditCard } from 'lucide-react'
import { AccountType } from '@prisma/client'

interface AddBankAccountDialogProps {
  onAccountAdded?: () => void
}

export function AddBankAccountDialog({ onAccountAdded }: AddBankAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionType, setConnectionType] = useState<'manual' | 'bank'>('manual')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'DEPOSIT' as AccountType,
    currency: 'USD',
    initialBalance: '0',
    institutionName: '',
  })

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          currency: formData.currency,
          balance: parseFloat(formData.initialBalance) || 0,
          institutionName: formData.institutionName || null,
          countryCode: 'US', // Default, can be made configurable
          regionGroup: 'US',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create account')
      }

      // Success!
      setOpen(false)
      resetForm()
      onAccountAdded?.()
    } catch (err) {
      console.error('Error creating account:', err)
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'DEPOSIT',
      currency: 'USD',
      initialBalance: '0',
      institutionName: '',
    })
    setError(null)
    setConnectionType('manual')
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Bank Account</DialogTitle>
          <DialogDescription>
            Add a new bank account to track transactions
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Connection Type Selection */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant={connectionType === 'manual' ? 'default' : 'outline'}
            onClick={() => setConnectionType('manual')}
            className="w-full"
          >
            <Building2 className="mr-2 h-4 w-4" />
            Manual Entry
          </Button>
          <Button
            type="button"
            variant={connectionType === 'bank' ? 'default' : 'outline'}
            onClick={() => setConnectionType('bank')}
            className="w-full"
            disabled
            title="Bank sync coming soon with Plaid integration"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Connect Bank
            <span className="ml-2 text-xs opacity-75">(Soon)</span>
          </Button>
        </div>

        {connectionType === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            {/* Account Name */}
            <div className="space-y-2">
              <Label htmlFor="account-name">Account Name *</Label>
              <Input
                id="account-name"
                placeholder="e.g., Chase Checking, Savings Account"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            {/* Institution Name (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="institution-name">Bank/Institution Name</Label>
              <Input
                id="institution-name"
                placeholder="e.g., Chase, Bank of America"
                value={formData.institutionName}
                onChange={(e) => setFormData(prev => ({ ...prev, institutionName: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Optional - helps organize your accounts
              </p>
            </div>

            {/* Account Type */}
            <div className="space-y-2">
              <Label htmlFor="account-type">Account Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: AccountType) =>
                  setFormData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger id="account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEPOSIT">Checking/Savings</SelectItem>
                  <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                  <SelectItem value="INVESTMENT">Investment</SelectItem>
                  <SelectItem value="LOAN">Loan</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="TRY">TRY - Turkish Lira</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Initial Balance */}
            <div className="space-y-2">
              <Label htmlFor="initial-balance">Current Balance *</Label>
              <Input
                id="initial-balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.initialBalance}
                onChange={(e) => setFormData(prev => ({ ...prev, initialBalance: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the current balance of this account
              </p>
            </div>

            {/* Info Alert */}
            <Alert>
              <AlertDescription className="text-sm">
                💡 <strong>Tip:</strong> You'll be able to connect your bank automatically using Plaid
                once that integration is complete. For now, you can add accounts manually and
                import transactions via CSV.
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </form>
        )}

        {connectionType === 'bank' && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-semibold">Bank Sync Coming Soon</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We're integrating with Plaid to enable automatic bank account connections.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              This will allow real-time transaction sync from 12,000+ financial institutions.
            </p>
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={() => setConnectionType('manual')}
              >
                Add Manually Instead
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
