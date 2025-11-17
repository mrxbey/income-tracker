'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AICategorization {
  suggestedCategory: string
  suggestedTags: string[]
  confidence: number
  reasoning?: string
}

interface AICategorySuggestionProps {
  transaction: {
    description: string
    merchant?: string | null
    amount: number
    currency: string
  }
  onAccept: (category: string, tags: string[]) => void
  onReject: () => void
}

export function AICategorySuggestion({ transaction, onAccept, onReject }: AICategorySuggestionProps) {
  const [suggestion, setSuggestion] = useState<AICategorization | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getSuggestion = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      })

      if (!response.ok) throw new Error('Failed to get suggestion')

      const data = await response.json()
      setSuggestion(data)
    } catch (err) {
      setError('Failed to get AI suggestion')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    if (suggestion) {
      onAccept(suggestion.suggestedCategory, suggestion.suggestedTags)
    }
  }

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Getting AI suggestion...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={getSuggestion} className="mt-2">
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!suggestion) {
    return (
      <Button variant="outline" size="sm" onClick={getSuggestion} className="gap-2">
        <Sparkles className="h-4 w-4" />
        Get AI Suggestion
      </Button>
    )
  }

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Suggestion</span>
            <Badge variant="secondary" className="ml-auto">
              {Math.round(suggestion.confidence * 100)}% confident
            </Badge>
          </div>

          {/* Category */}
          <div>
            <span className="text-sm text-muted-foreground">Category:</span>
            <div className="mt-1">
              <Badge variant="default">{suggestion.suggestedCategory}</Badge>
            </div>
          </div>

          {/* Tags */}
          {suggestion.suggestedTags.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Tags:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {suggestion.suggestedTags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Reasoning */}
          {suggestion.reasoning && (
            <p className="text-xs text-muted-foreground italic">{suggestion.reasoning}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAccept} className="flex-1 gap-1">
              <Check className="h-3 w-3" />
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} className="gap-1">
              <X className="h-3 w-3" />
              Decline
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Confidence indicator
export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const getVariant = () => {
    if (confidence >= 0.8) return 'default'
    if (confidence >= 0.6) return 'secondary'
    return 'outline'
  }

  const getColor = () => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Badge variant={getVariant()} className={cn('gap-1', getColor())}>
      <Sparkles className="h-3 w-3" />
      {Math.round(confidence * 100)}%
    </Badge>
  )
}

// Bulk categorization UI
interface BulkCategorizationProps {
  transactions: Array<{
    id: string
    description: string
    merchant?: string | null
    amount: number
    currency: string
  }>
  onComplete: (results: Array<{ id: string; category: string; tags: string[] }>) => void
}

export function BulkCategorization({ transactions, onComplete }: BulkCategorizationProps) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const categorizeAll = async () => {
    setLoading(true)
    setProgress(0)

    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
      })

      if (!response.ok) throw new Error('Failed to categorize')

      const { results } = await response.json()

      const mappedResults = transactions.map((txn, index) => ({
        id: txn.id,
        category: results[index].suggestedCategory,
        tags: results[index].suggestedTags,
      }))

      onComplete(mappedResults)
    } catch (error) {
      console.error('Bulk categorization error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">AI Categorization</h3>
              <p className="text-sm text-muted-foreground">
                Categorize {transactions.length} uncategorized transactions
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing transactions...</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <Button onClick={categorizeAll} disabled={loading} className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            {loading ? 'Categorizing...' : 'Categorize All with AI'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
