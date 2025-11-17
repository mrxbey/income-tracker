'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'
import {
  Loader2,
  DollarSign,
  RefreshCw,
  Plus,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { MultiCurrencyBalance } from '@/lib/services/currency-service'

interface MultiCurrencyDisplayProps {
  currencies?: string[]
}

export function MultiCurrencyDisplay({
  currencies = ['USD', 'TRY', 'GBP', 'EUR'],
}: MultiCurrencyDisplayProps) {
  const [balances, setBalances] = useState<MultiCurrencyBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addRateOpen, setAddRateOpen] = useState(false)

  useEffect(() => {
    loadBalances()
  }, [])

  const loadBalances = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/currency/networth?currencies=${currencies.join(',')}`)

      if (!response.ok) {
        throw new Error('Failed to load currency balances')
      }

      const data = await response.json()
      setBalances(data.balances || [])
    } catch (err) {
      console.error('Error loading balances:', err)
      setError('Failed to load currency balances')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading currency data...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Net Worth by Currency</CardTitle>
              <CardDescription>Your total net worth in different currencies</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Dialog open={addRateOpen} onOpenChange={setAddRateOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Rate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <AddExchangeRateForm onSuccess={() => {
                    setAddRateOpen(false)
                    loadBalances()
                  }} />
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={loadBalances}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {balances.map((balance) => (
              <Card key={balance.currency} className={balance.isBase ? 'border-primary' : ''}>
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          {balance.currency}
                        </p>
                        {balance.isBase && (
                          <Badge variant="default" className="text-xs">Base</Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold">
                        {formatCurrency(balance.amount, balance.currency)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <ExchangeRatesList />
    </div>
  )
}

function AddExchangeRateForm({ onSuccess }: { onSuccess: () => void }) {
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('TRY')
  const [rate, setRate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!rate || parseFloat(rate) <= 0) {
      setError('Please enter a valid exchange rate')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/currency/rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromCurrency,
          toCurrency,
          rate: parseFloat(rate),
          notes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save exchange rate')
      }

      onSuccess()
    } catch (err) {
      console.error('Error saving exchange rate:', err)
      setError('Failed to save exchange rate')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Add Exchange Rate</DialogTitle>
        <DialogDescription>
          Add a custom exchange rate between two currencies
        </DialogDescription>
      </DialogHeader>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fromCurrency">From Currency</Label>
          <Input
            id="fromCurrency"
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value.toUpperCase())}
            placeholder="USD"
            maxLength={3}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="toCurrency">To Currency</Label>
          <Input
            id="toCurrency"
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value.toUpperCase())}
            placeholder="TRY"
            maxLength={3}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rate">Exchange Rate</Label>
        <Input
          id="rate"
          type="number"
          step="0.00000001"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="30.5"
          required
        />
        <p className="text-xs text-muted-foreground">
          1 {fromCurrency} = {rate || '?'} {toCurrency}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Central Bank rate"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Rate'
          )}
        </Button>
      </div>
    </form>
  )
}

function ExchangeRatesList() {
  const [rates, setRates] = useState<Array<{
    id: string
    fromCurrency: string
    toCurrency: string
    rate: number
    date: Date
    source: string
    notes: string | null
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRates()
  }, [])

  const loadRates = async () => {
    try {
      const response = await fetch('/api/currency/rates')
      if (response.ok) {
        const data = await response.json()
        setRates(data.rates || [])
      }
    } catch (err) {
      console.error('Error loading rates:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  if (rates.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Exchange Rates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rates.slice(0, 5).map((rate) => (
            <div
              key={rate.id}
              className="flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {rate.fromCurrency} → {rate.toCurrency}
                </p>
                {rate.notes && (
                  <p className="text-xs text-muted-foreground">{rate.notes}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold">{rate.rate.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(rate.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
