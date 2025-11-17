'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'
import {
  Loader2,
  AlertCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  DollarSign,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { SpendingAlert, AlertSeverity } from '@/lib/ai/spending-alerts'

export function SpendingAlerts() {
  const [alerts, setAlerts] = useState<SpendingAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/ai/spending-alerts')

      if (!response.ok) {
        throw new Error('Failed to load alerts')
      }

      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch (err) {
      console.error('Error loading alerts:', err)
      setError('Failed to load spending alerts')
    } finally {
      setLoading(false)
    }
  }

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId))
  }

  const handleAction = (alert: SpendingAlert) => {
    if (alert.actionUrl) {
      router.push(alert.actionUrl)
    }
  }

  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id))

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading alerts...</span>
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

  if (visibleAlerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Info className="mx-auto h-12 w-12 text-green-500" />
          <p className="mt-4 text-sm font-medium text-green-600">All Good!</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No spending alerts at the moment. Keep up the good work!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Spending Alerts</h3>
          <p className="text-sm text-muted-foreground">
            {visibleAlerts.length} {visibleAlerts.length === 1 ? 'alert' : 'alerts'} requiring your
            attention
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAlerts}>
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {visibleAlerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} onAction={handleAction} />
        ))}
      </div>
    </div>
  )
}

interface AlertCardProps {
  alert: SpendingAlert
  onDismiss: (id: string) => void
  onAction: (alert: SpendingAlert) => void
}

function AlertCard({ alert, onDismiss, onAction }: AlertCardProps) {
  const Icon = getAlertIcon(alert.severity)
  const severityColor = getSeverityColor(alert.severity)

  return (
    <Card className={`border-l-4 ${severityColor.border}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Icon className={`mt-0.5 h-5 w-5 ${severityColor.text}`} />
            <div className="space-y-1">
              <CardTitle className="text-base">{alert.title}</CardTitle>
              <CardDescription className="text-sm">{alert.message}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <SeverityBadge severity={alert.severity} />
            <Button variant="ghost" size="sm" onClick={() => onDismiss(alert.id)} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {(alert.categoryName || alert.amount || alert.actionable) && (
        <CardContent className="space-y-3">
          {(alert.categoryName || alert.amount) && (
            <div className="flex items-center space-x-4 text-sm">
              {alert.categoryName && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">{alert.categoryName}</span>
                </div>
              )}
              {alert.amount && alert.currency && (
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatCurrency(alert.amount, alert.currency)}</span>
                </div>
              )}
            </div>
          )}
          {alert.actionable && alert.actionText && (
            <Button size="sm" variant="outline" onClick={() => onAction(alert)} className="w-full">
              {alert.actionText}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const variants: Record<AlertSeverity, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
    INFO: { variant: 'secondary', label: 'Info' },
    WARNING: { variant: 'default', label: 'Warning' },
    CRITICAL: { variant: 'destructive', label: 'Critical' },
  }

  const config = variants[severity] || variants.INFO

  return <Badge variant={config.variant}>{config.label}</Badge>
}

function getAlertIcon(severity: AlertSeverity) {
  switch (severity) {
    case 'CRITICAL':
      return AlertCircle
    case 'WARNING':
      return AlertTriangle
    case 'INFO':
      return Info
    default:
      return Info
  }
}

function getSeverityColor(severity: AlertSeverity) {
  switch (severity) {
    case 'CRITICAL':
      return { border: 'border-l-red-500', text: 'text-red-500' }
    case 'WARNING':
      return { border: 'border-l-yellow-500', text: 'text-yellow-500' }
    case 'INFO':
      return { border: 'border-l-blue-500', text: 'text-blue-500' }
    default:
      return { border: 'border-l-gray-500', text: 'text-gray-500' }
  }
}

/**
 * Compact widget version for dashboard
 */
export function SpendingAlertsWidget() {
  const [alertCount, setAlertCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAlertCount()
  }, [])

  const loadAlertCount = async () => {
    try {
      const response = await fetch('/api/ai/spending-alerts')
      if (response.ok) {
        const data = await response.json()
        setAlertCount(data.count || 0)
      }
    } catch (err) {
      console.error('Error loading alert count:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          {alertCount > 0 ? (
            <>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-2xl font-bold">{alertCount}</span>
            </>
          ) : (
            <>
              <Info className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">All clear</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
