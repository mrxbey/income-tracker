'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'
import {
  Loader2,
  Target,
  Calendar,
  TrendingUp,
  Check,
  Plus,
} from 'lucide-react'
import type { GoalWithProgress } from '@/lib/services/goal-service'

export function GoalTracker() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGoals()
  }, [])

  const loadGoals = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/goals')

      if (!response.ok) {
        throw new Error('Failed to load goals')
      }

      const data = await response.json()
      setGoals(data.goals || [])
    } catch (err) {
      console.error('Error loading goals:', err)
      setError('Failed to load goals')
    } finally {
      setLoading(false)
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

  const activeGoals = goals.filter((g) => !g.isCompleted)
  const completedGoals = goals.filter((g) => g.isCompleted)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Financial Goals</CardTitle>
              <CardDescription>
                Track your progress towards {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
              </CardDescription>
            </div>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Goal
            </Button>
          </div>
        </CardHeader>
      </Card>

      {activeGoals.length === 0 && completedGoals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">No Goals Yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create goals to track your financial progress
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Active Goals</h3>
              {activeGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onUpdate={loadGoals} />
              ))}
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Completed Goals</h3>
              {completedGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onUpdate={loadGoals} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function GoalCard({ goal, onUpdate }: { goal: GoalWithProgress; onUpdate: () => void }) {
  return (
    <Card className={goal.isCompleted ? 'bg-green-50/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center">
              {goal.isCompleted && <Check className="mr-2 h-4 w-4 text-green-500" />}
              {goal.name}
            </CardTitle>
            {goal.description && (
              <CardDescription className="text-xs">{goal.description}</CardDescription>
            )}
          </div>
          {goal.isCompleted ? (
            <Badge variant="default" className="bg-green-500">
              Completed
            </Badge>
          ) : goal.daysRemaining !== null && goal.daysRemaining < 30 ? (
            <Badge variant="destructive">
              {goal.daysRemaining} days left
            </Badge>
          ) : (
            <Badge variant="secondary">
              {Math.round(goal.progressPercentage)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {formatCurrency(goal.currentAmount, goal.currency)} / {formatCurrency(goal.targetAmount, goal.currency)}
            </span>
          </div>
          <Progress value={Math.min(goal.progressPercentage, 100)} className="h-3" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {goal.remainingAmount > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="font-medium">{formatCurrency(goal.remainingAmount, goal.currency)}</p>
            </div>
          )}
          {goal.targetDate && (
            <div>
              <p className="text-xs text-muted-foreground">Target Date</p>
              <p className="font-medium flex items-center">
                <Calendar className="mr-1 h-3 w-3" />
                {new Date(goal.targetDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Recommendation */}
        {!goal.isCompleted && goal.recommendedMonthlyContribution && goal.recommendedMonthlyContribution > 0 && (
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs text-blue-600 flex items-center">
              <TrendingUp className="mr-1 h-3 w-3" />
              Recommended monthly contribution:{' '}
              <strong className="ml-1">{formatCurrency(goal.recommendedMonthlyContribution, goal.currency)}</strong>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
