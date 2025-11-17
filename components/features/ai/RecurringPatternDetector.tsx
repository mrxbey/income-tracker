'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'
import { Loader2, TrendingUp, Calendar, DollarSign, AlertCircle, Check } from 'lucide-react'
import type { RecurringPattern } from '@/lib/ai/recurring-detection'

interface RecurringPatternDetectorProps {
  minOccurrences?: number
}

export function RecurringPatternDetector({ minOccurrences = 3 }: RecurringPatternDetectorProps) {
  const [patterns, setPatterns] = useState<RecurringPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingFixed, setCreatingFixed] = useState<string | null>(null)

  useEffect(() => {
    detectPatterns()
  }, [minOccurrences])

  const detectPatterns = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/ai/detect-recurring?minOccurrences=${minOccurrences}`)

      if (!response.ok) {
        throw new Error('Failed to detect patterns')
      }

      const data = await response.json()
      setPatterns(data.patterns || [])
    } catch (err) {
      console.error('Error detecting patterns:', err)
      setError('Failed to detect recurring patterns')
    } finally {
      setLoading(false)
    }
  }

  const createFixedExpense = async (pattern: RecurringPattern) => {
    try {
      setCreatingFixed(pattern.merchant)

      const response = await fetch('/api/ai/detect-recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pattern }),
      })

      if (!response.ok) {
        throw new Error('Failed to create fixed expense')
      }

      // Remove pattern from list after creating
      setPatterns((prev) => prev.filter((p) => p.merchant !== pattern.merchant))
    } catch (err) {
      console.error('Error creating fixed expense:', err)
      setError('Failed to create fixed expense')
    } finally {
      setCreatingFixed(null)
    }
  }

  const dismissPattern = (merchant: string) => {
    setPatterns((prev) => prev.filter((p) => p.merchant !== merchant))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Analyzing your transactions...</span>
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

  if (patterns.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            No recurring patterns detected yet. Keep adding transactions!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Recurring Patterns Detected</h3>
          <p className="text-sm text-muted-foreground">
            We found {patterns.length} potential recurring {patterns.length === 1 ? 'transaction' : 'transactions'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={detectPatterns}>
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {patterns.map((pattern) => (
          <Card key={pattern.merchant}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{pattern.merchant}</CardTitle>
                  <CardDescription className="text-xs">{pattern.description}</CardDescription>
                </div>
                <ConfidenceBadge confidence={pattern.confidence} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Average Amount</p>
                    <p className="font-medium">
                      {formatCurrency(pattern.averageAmount, pattern.currency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Frequency</p>
                    <p className="font-medium capitalize">{pattern.frequency.toLowerCase()}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Occurrences</p>
                    <p className="font-medium">{pattern.occurrences}x</p>
                  </div>
                </div>
              </div>

              {pattern.frequency === 'MONTHLY' && pattern.dayOfMonth && (
                <p className="text-xs text-muted-foreground">
                  Usually occurs on the <strong>{pattern.dayOfMonth}th</strong> of each month
                </p>
              )}

              {pattern.frequency === 'WEEKLY' && pattern.dayOfWeek !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Usually occurs on{' '}
                  <strong>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][pattern.dayOfWeek]}</strong>
                </p>
              )}

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Next Expected</p>
                <p className="text-sm font-medium">
                  {new Date(pattern.nextExpectedDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => createFixedExpense(pattern)}
                  disabled={creatingFixed === pattern.merchant}
                  className="flex-1"
                >
                  {creatingFixed === pattern.merchant ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Track as Fixed Expense
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => dismissPattern(pattern.merchant)}
                  disabled={creatingFixed === pattern.merchant}
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100)

  let variant: 'default' | 'secondary' | 'destructive' = 'default'
  let label = 'High'

  if (confidence < 0.7) {
    variant = 'secondary'
    label = 'Medium'
  }
  if (confidence < 0.5) {
    variant = 'destructive'
    label = 'Low'
  }

  return (
    <Badge variant={variant}>
      {percentage}% {label} Confidence
    </Badge>
  )
}
