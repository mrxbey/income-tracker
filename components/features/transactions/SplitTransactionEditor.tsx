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
  Plus,
  Trash2,
  AlertCircle,
  Check,
  Split,
  Percent,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SplitItem {
  id?: string
  categoryId: string
  categoryName?: string
  amount: number
  percentage?: number | null
  description?: string | null
}

interface SplitTransactionEditorProps {
  transactionId: string
  transactionAmount: number
  currency: string
  categories: Array<{ id: string; name: string }>
  onComplete?: () => void
}

export function SplitTransactionEditor({
  transactionId,
  transactionAmount,
  currency,
  categories,
  onComplete,
}: SplitTransactionEditorProps) {
  const [splits, setSplits] = useState<SplitItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalAmount = Math.abs(transactionAmount)

  useEffect(() => {
    loadSplits()
  }, [transactionId])

  const loadSplits = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/transactions/${transactionId}/splits`)

      if (response.ok) {
        const data = await response.json()
        if (data.splits && data.splits.length > 0) {
          setSplits(data.splits)
        } else {
          // Initialize with one empty split
          addSplit()
        }
      }
    } catch (err) {
      console.error('Error loading splits:', err)
    } finally {
      setLoading(false)
    }
  }

  const addSplit = () => {
    const remaining = totalAmount - splits.reduce((sum, s) => sum + s.amount, 0)

    setSplits([
      ...splits,
      {
        categoryId: '',
        amount: Math.max(0, remaining),
        percentage: null,
        description: null,
      },
    ])
  }

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index))
  }

  const updateSplit = (index: number, field: keyof SplitItem, value: unknown) => {
    const newSplits = [...splits]
    newSplits[index] = { ...newSplits[index], [field]: value }

    // If amount changed, recalculate percentage
    if (field === 'amount') {
      newSplits[index].percentage = (Number(value) / totalAmount) * 100
    }

    // If percentage changed, recalculate amount
    if (field === 'percentage') {
      newSplits[index].amount = (Number(value) * totalAmount) / 100
    }

    setSplits(newSplits)
  }

  const distributEquallyEvenly = () => {
    const splitCount = splits.length
    const amountPerSplit = totalAmount / splitCount

    setSplits(
      splits.map((split) => ({
        ...split,
        amount: amountPerSplit,
        percentage: 100 / splitCount,
      }))
    )
  }

  const saveSplits = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validate
      const total = splits.reduce((sum, s) => sum + s.amount, 0)
      if (Math.abs(total - totalAmount) > 0.01) {
        setError(`Split total ($${total.toFixed(2)}) must equal transaction amount ($${totalAmount.toFixed(2)})`)
        return
      }

      // Check all splits have categories
      if (splits.some((s) => !s.categoryId)) {
        setError('All splits must have a category selected')
        return
      }

      const response = await fetch(`/api/transactions/${transactionId}/splits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ splits }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save splits')
      }

      onComplete?.()
    } catch (err: unknown) {
      console.error('Error saving splits:', err)
      setError(err instanceof Error ? err.message : 'Failed to save splits')
    } finally {
      setSaving(false)
    }
  }

  const removeSplitting = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/transactions/${transactionId}/splits`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove splits')
      }

      onComplete?.()
    } catch (err) {
      console.error('Error removing splits:', err)
      setError('Failed to remove splits')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  const splitTotal = splits.reduce((sum, s) => sum + s.amount, 0)
  const remaining = totalAmount - splitTotal
  const isValid = Math.abs(remaining) < 0.01 && splits.every((s) => s.categoryId)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Split className="mr-2 h-5 w-5" />
              Split Transaction
            </CardTitle>
            <CardDescription>
              Divide {formatCurrency(totalAmount, currency)} across multiple categories
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={distributEquallyEvenly}>
            <Percent className="mr-2 h-4 w-4" />
            Equal Split
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Splits */}
        <div className="space-y-3">
          {splits.map((split, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={split.categoryId}
                        onValueChange={(value) => updateSplit(index, 'categoryId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSplit(index)}
                      className="mt-8"
                      disabled={splits.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={split.amount}
                        onChange={(e) => updateSplit(index, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Percentage</Label>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          step="0.01"
                          value={split.percentage?.toFixed(2) || '0.00'}
                          onChange={(e) => updateSplit(index, 'percentage', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                        <span className="ml-2 text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Input
                      value={split.description || ''}
                      onChange={(e) => updateSplit(index, 'description', e.target.value)}
                      placeholder="e.g., Food items"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{formatCurrency(splitTotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remaining</span>
                <span className={`font-medium ${Math.abs(remaining) < 0.01 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(remaining, currency)}
                </span>
              </div>
              {isValid && (
                <Badge variant="default" className="w-full justify-center bg-green-500">
                  <Check className="mr-1 h-3 w-3" />
                  Splits are valid
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button onClick={addSplit} variant="outline" className="flex-1">
            <Plus className="mr-2 h-4 w-4" />
            Add Split
          </Button>
          <Button onClick={saveSplits} disabled={!isValid || saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Splits'
            )}
          </Button>
        </div>

        {splits.length > 0 && splits[0].id && (
          <Button
            variant="destructive"
            onClick={removeSplitting}
            disabled={saving}
            className="w-full"
          >
            Remove Splitting
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
