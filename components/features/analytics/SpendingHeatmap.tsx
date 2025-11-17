'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'
import { Loader2, AlertCircle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'

interface DaySpending {
  date: string
  amount: number
  transactionCount: number
}

interface SpendingHeatmapProps {
  currency?: string
}

export function SpendingHeatmap({ currency = 'USD' }: SpendingHeatmapProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [spendingData, setSpendingData] = useState<DaySpending[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredDay, setHoveredDay] = useState<DaySpending | null>(null)

  useEffect(() => {
    loadSpendingData()
  }, [currentMonth])

  const loadSpendingData = async () => {
    try {
      setLoading(true)
      setError(null)

      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)

      const response = await fetch(
        `/api/analytics/daily-spending?dateFrom=${format(start, 'yyyy-MM-dd')}&dateTo=${format(end, 'yyyy-MM-dd')}`
      )

      if (!response.ok) {
        throw new Error('Failed to load spending data')
      }

      const data = await response.json()
      setSpendingData(data.dailySpending || [])
    } catch (err) {
      console.error('Error loading spending data:', err)
      setError('Failed to load spending data')
    } finally {
      setLoading(false)
    }
  }

  const getSpendingForDay = (date: Date): DaySpending | undefined => {
    return spendingData.find((d) => isSameDay(new Date(d.date), date))
  }

  const getColorIntensity = (amount: number): string => {
    if (amount === 0) return 'bg-gray-100 dark:bg-gray-800'

    const maxSpending = Math.max(...spendingData.map((d) => d.amount), 1)
    const intensity = amount / maxSpending

    if (intensity < 0.2) return 'bg-green-100 dark:bg-green-900/20'
    if (intensity < 0.4) return 'bg-yellow-100 dark:bg-yellow-900/30'
    if (intensity < 0.6) return 'bg-orange-200 dark:bg-orange-900/40'
    if (intensity < 0.8) return 'bg-red-200 dark:bg-red-900/50'
    return 'bg-red-300 dark:bg-red-900/70'
  }

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading heatmap...</span>
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

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Calculate start day offset (0 = Sunday, 6 = Saturday)
  const startDayOfWeek = monthStart.getDay()

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Spending Heatmap
            </CardTitle>
            <CardDescription>Daily spending intensity for {format(currentMonth, 'MMMM yyyy')}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}

            {/* Empty cells for days before month start */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {daysInMonth.map((day) => {
              const spending = getSpendingForDay(day)
              const amount = spending?.amount || 0
              const colorClass = getColorIntensity(amount)
              const isToday = isSameDay(day, new Date())

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    relative aspect-square cursor-pointer rounded-md border transition-all
                    ${colorClass}
                    ${isToday ? 'border-blue-500 border-2' : 'border-gray-200 dark:border-gray-700'}
                    hover:scale-110 hover:shadow-lg hover:z-10
                  `}
                  onMouseEnter={() => setHoveredDay(spending || { date: format(day, 'yyyy-MM-dd'), amount: 0, transactionCount: 0 })}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <div className="flex h-full flex-col items-center justify-center p-1">
                    <span className="text-xs font-medium">{format(day, 'd')}</span>
                    {amount > 0 && (
                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                        {spending?.transactionCount || 0}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Hover Tooltip */}
          {hoveredDay && (
            <Card className="border-2 border-blue-500">
              <CardContent className="py-3">
                <div className="text-sm">
                  <p className="font-medium">{format(new Date(hoveredDay.date), 'EEEE, MMMM d, yyyy')}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Amount Spent:</span>
                    <span className="font-bold text-red-500">
                      {formatCurrency(hoveredDay.amount, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Transactions:</span>
                    <span className="font-medium">{hoveredDay.transactionCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="text-sm text-muted-foreground">Less</span>
            <div className="flex items-center space-x-1">
              <div className="h-4 w-4 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 w-4 rounded bg-green-100 dark:bg-green-900/20" />
              <div className="h-4 w-4 rounded bg-yellow-100 dark:bg-yellow-900/30" />
              <div className="h-4 w-4 rounded bg-orange-200 dark:bg-orange-900/40" />
              <div className="h-4 w-4 rounded bg-red-200 dark:bg-red-900/50" />
              <div className="h-4 w-4 rounded bg-red-300 dark:bg-red-900/70" />
            </div>
            <span className="text-sm text-muted-foreground">More</span>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-lg font-bold text-red-500">
                {formatCurrency(spendingData.reduce((sum, d) => sum + d.amount, 0), currency)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Avg Per Day</p>
              <p className="text-lg font-bold">
                {formatCurrency(
                  spendingData.reduce((sum, d) => sum + d.amount, 0) / daysInMonth.length,
                  currency
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Active Days</p>
              <p className="text-lg font-bold">{spendingData.filter((d) => d.amount > 0).length}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
