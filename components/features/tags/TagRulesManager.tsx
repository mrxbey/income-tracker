'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, Tag as TagIcon, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import type { TagRuleWithDetails } from '@/lib/services/tag-rule-service'

export function TagRulesManager() {
  const [rules, setRules] = useState<TagRuleWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tag-rules')

      if (!response.ok) {
        throw new Error('Failed to load tag rules')
      }

      const data = await response.json()
      setRules(data.rules || [])
    } catch (err) {
      console.error('Error loading tag rules:', err)
      setError('Failed to load tag rules')
    } finally {
      setLoading(false)
    }
  }

  const toggleRule = async (ruleId: string, active: boolean) => {
    try {
      const response = await fetch(`/api/tag-rules/${ruleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !active }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle rule')
      }

      await loadRules()
    } catch (err) {
      console.error('Error toggling rule:', err)
    }
  }

  const deleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/tag-rules/${ruleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete rule')
      }

      await loadRules()
    } catch (err) {
      console.error('Error deleting rule:', err)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
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
              <CardTitle>Tag Rules</CardTitle>
              <CardDescription>
                Automatically apply tags and categories based on patterns
              </CardDescription>
            </div>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="py-8 text-center">
              <TagIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                No tag rules yet. Create rules to automatically tag transactions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={rule.active ? 'default' : 'secondary'}>
                            {rule.patternType.replace(/_/g, ' ')}
                          </Badge>
                          <code className="text-sm">{rule.pattern}</code>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {rule.tagNames.map((tagName) => (
                            <Badge key={tagName} variant="outline">
                              <TagIcon className="mr-1 h-3 w-3" />
                              {tagName}
                            </Badge>
                          ))}
                          {rule.categoryName && (
                            <Badge variant="secondary">{rule.categoryName}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Priority: {rule.priority} | Confidence: +{rule.confidenceBoost}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRule(rule.id, rule.active)}
                        >
                          {rule.active ? (
                            <ToggleRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
