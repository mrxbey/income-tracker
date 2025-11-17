'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  LineChart as LineChartIcon,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { NetWorthData } from '@/lib/services/networth-service'

interface NetWorthStats {
  current: number
  change30Days: number
  change90Days: number
  changeYear: number
  percentChange30Days: number
  percentChange90Days: number
  percentChangeYear: number
  allTimeHigh: number
  allTimeLow: number
}

interface NetWorthChartProps {
  daysBack?: number
}

export function NetWorthChart({ daysBack = 90 }: NetWorthChartProps) {
  const [history, setHistory] = useState<NetWorthData[]>([])
  const [stats, setStats] = useState<NetWorthStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'30' | '90' | '365'>(daysBack === 30 ? '30' : daysBack === 365 ? '365' : '90')

  useEffect(() => {
    loadNetWorthData(parseInt(period))
  }, [period])

  const loadNetWorthData = async (days: number) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/networth?days=${days}&stats=true`)

      if (!response.ok) {
        throw new Error('Failed to load net worth data')
      }

      const data = await response.json()
      setHistory(data.history || [])
      setStats(data.stats || null)
    } catch (err) {
      console.error('Error loading net worth data:', err)
      setError('Failed to load net worth data')
    } finally {
      setLoading(false)
    }
  }

  const saveSnapshot = async () => {
    try {
      const response = await fetch('/api/networth', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to save snapshot')
      }

      // Reload data
      await loadNetWorthData(parseInt(period))
    } catch (err) {
      console.error('Error saving snapshot:', err)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading net worth data...</span>
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

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <LineChartIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">No Net Worth Data Yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start tracking your net worth by saving a snapshot
          </p>
          <Button className="mt-4" size="sm" onClick={saveSnapshot}>
            Save First Snapshot
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Format data for chart
  const chartData = history.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    assets: item.assets,
    liabilities: item.liabilities,
    netWorth: item.netWorth,
  }))

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Current Net Worth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.current, 'USD')}</div>
              {stats.change30Days !== 0 && (
                <p className="flex items-center text-xs text-muted-foreground mt-1">
                  {stats.change30Days > 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span className={stats.change30Days > 0 ? 'text-green-500' : 'text-red-500'}>
                    {stats.percentChange30Days > 0 ? '+' : ''}
                    {stats.percentChange30Days.toFixed(1)}%
                  </span>
                  <span className="ml-1">vs 30 days ago</span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>90-Day Change</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.change90Days >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.change90Days >= 0 ? '+' : ''}
                {formatCurrency(stats.change90Days, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.percentChange90Days >= 0 ? '+' : ''}
                {stats.percentChange90Days.toFixed(1)}% change
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Yearly Change</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.changeYear >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.changeYear >= 0 ? '+' : ''}
                {formatCurrency(stats.changeYear, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.percentChangeYear >= 0 ? '+' : ''}
                {stats.percentChangeYear.toFixed(1)}% change
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Net Worth Over Time</CardTitle>
              <CardDescription>Track your financial progress</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={period === '30' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('30')}
              >
                30D
              </Button>
              <Button
                variant={period === '90' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('90')}
              >
                90D
              </Button>
              <Button
                variant={period === '365' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('365')}
              >
                1Y
              </Button>
              <Button variant="outline" size="sm" onClick={saveSnapshot}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Assets
                            </span>
                            <span className="font-bold text-green-500">
                              {formatCurrency(payload[0].value as number, 'USD')}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Liabilities
                            </span>
                            <span className="font-bold text-red-500">
                              {formatCurrency(payload[1].value as number, 'USD')}
                            </span>
                          </div>
                          <div className="flex flex-col col-span-2">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Net Worth
                            </span>
                            <span className="font-bold text-blue-500">
                              {formatCurrency(payload[2].value as number, 'USD')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="assets"
                stroke="#10b981"
                strokeWidth={2}
                name="Assets"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="liabilities"
                stroke="#ef4444"
                strokeWidth={2}
                name="Liabilities"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="netWorth"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Net Worth"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* All-Time Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>All-Time High</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-500">
                {formatCurrency(stats.allTimeHigh, 'USD')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>All-Time Low</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-500">
                {formatCurrency(stats.allTimeLow, 'USD')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
