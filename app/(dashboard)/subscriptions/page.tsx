'use client'

import { useEffect, useState } from 'react'
import { SubscriptionCard } from '@/components/features/subscriptions/SubscriptionCard'
import { SubscriptionStats } from '@/components/features/subscriptions/SubscriptionStats'
import { CalendarExportDialog } from '@/components/features/calendar/CalendarExportDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar as CalendarIcon,
  Bell,
} from 'lucide-react'
import type {
  Subscription,
  SubscriptionStats as Stats,
  SubscriptionAlert,
} from '@/lib/services/subscription-service'

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [alerts, setAlerts] = useState<SubscriptionAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'trial' | 'unused'>('all')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [subsResponse, statsResponse, alertsResponse] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/subscriptions?action=stats'),
        fetch('/api/subscriptions?action=alerts'),
      ])

      if (!subsResponse.ok || !statsResponse.ok || !alertsResponse.ok) {
        throw new Error('Failed to fetch subscription data')
      }

      const subsData = await subsResponse.json()
      const statsData = await statsResponse.json()
      const alertsData = await alertsResponse.json()

      setSubscriptions(subsData.subscriptions || [])
      setStats(statsData.stats)
      setAlerts(alertsData.alerts || [])
    } catch (err) {
      console.error('Error fetching subscriptions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleManage = (subscription: Subscription) => {
    console.log('Manage subscription:', subscription.name)
    // TODO: Open manage dialog
  }

  const handleCancel = async (subscription: Subscription) => {
    if (!subscription.fixedExpenseId) {
      alert('This subscription was auto-detected. Convert it to a fixed expense first.')
      return
    }

    if (confirm(`Are you sure you want to cancel ${subscription.name}?`)) {
      try {
        const response = await fetch(
          `/api/fixed-expenses/${subscription.fixedExpenseId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: false }),
          }
        )

        if (!response.ok) throw new Error('Failed to cancel subscription')

        // Refresh data
        await fetchData()
      } catch (err) {
        console.error('Error cancelling subscription:', err)
        alert('Failed to cancel subscription')
      }
    }
  }

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (filter === 'all') return true
    if (filter === 'active') return sub.status === 'active'
    if (filter === 'trial') return sub.status === 'trial'
    if (filter === 'unused') return (sub.usageScore || 0) < 20
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Subscriptions</h2>
          <p className="text-muted-foreground">Track and manage your recurring subscriptions</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Subscriptions</h2>
          <p className="text-muted-foreground">
            Track and manage your recurring subscriptions
          </p>
        </div>
        <div className="flex gap-2">
          <CalendarExportDialog />
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertTitle>Subscription Alerts</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {alerts.slice(0, 3).map((alert, i) => (
                <div key={i} className="text-sm">
                  • {alert.message}
                </div>
              ))}
              {alerts.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{alerts.length - 3} more alerts
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      {stats && <SubscriptionStats stats={stats} />}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filter:</span>
        <div className="flex gap-2">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            All ({subscriptions.length})
          </Badge>
          <Badge
            variant={filter === 'active' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('active')}
          >
            Active ({subscriptions.filter((s) => s.status === 'active').length})
          </Badge>
          <Badge
            variant={filter === 'trial' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('trial')}
          >
            Trial ({subscriptions.filter((s) => s.status === 'trial').length})
          </Badge>
          <Badge
            variant={filter === 'unused' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('unused')}
          >
            Unused ({subscriptions.filter((s) => (s.usageScore || 0) < 20).length})
          </Badge>
        </div>
      </div>

      {/* Subscriptions grid */}
      {filteredSubscriptions.length === 0 ? (
        <div className="text-center py-12">
          <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No subscriptions found</h3>
          <p className="text-sm text-muted-foreground mt-2">
            {filter === 'all'
              ? 'Start adding transactions to automatically detect subscriptions'
              : `No ${filter} subscriptions found`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onManage={handleManage}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  )
}
