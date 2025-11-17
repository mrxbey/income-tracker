'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  AlertCircle,
  Bell,
  BellOff,
  Check,
  Trash2,
  ExternalLink,
  CheckCheck,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Notification, NotificationPriority } from '@/lib/services/notification-service'
import { formatDistanceToNow } from 'date-fns'

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadNotifications()
  }, [showUnreadOnly])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (showUnreadOnly) params.append('unreadOnly', 'true')
      params.append('limit', '50')

      const response = await fetch(`/api/notifications?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to load notifications')
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Error loading notifications:', err)
      setError('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      // Update local state
      setNotifications(
        notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete notification')
      }

      // Update local state
      setNotifications(notifications.filter((n) => n.id !== notificationId))
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      // Update local state
      setNotifications(notifications.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  const handleAction = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading notifications...</span>
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

  const displayNotifications = showUnreadOnly
    ? notifications.filter((n) => !n.read)
    : notifications

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Stay updated with your financial activities</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                {showUnreadOnly ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                {showUnreadOnly ? 'Show All' : 'Unread Only'}
              </Button>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {displayNotifications.length === 0 ? (
            <div className="py-8 text-center">
              <BellOff className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                {showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {showUnreadOnly ? 'All caught up!' : "You'll see notifications here as they arrive"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onAction={handleAction}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface NotificationCardProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onAction: (notification: Notification) => void
}

function NotificationCard({
  notification,
  onMarkAsRead,
  onDelete,
  onAction,
}: NotificationCardProps) {
  const priorityColor = getPriorityColor(notification.priority)

  return (
    <Card
      className={`
        ${!notification.read ? 'border-l-4 bg-muted/50' : 'border-l-4'}
        ${priorityColor.border}
        transition-all hover:shadow-md
      `}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              {!notification.read && (
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              )}
              <h4 className="text-sm font-semibold">{notification.title}</h4>
              <PriorityBadge priority={notification.priority} />
            </div>
            <p className="text-sm text-muted-foreground">{notification.message}</p>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
            </div>
            {notification.actionUrl && notification.actionText && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction(notification)}
                className="mt-2"
              >
                {notification.actionText}
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex items-start space-x-1">
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkAsRead(notification.id)}
                className="h-8 w-8 p-0"
                title="Mark as read"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(notification.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PriorityBadge({ priority }: { priority: NotificationPriority }) {
  const config: Record<
    NotificationPriority,
    { variant: 'default' | 'secondary' | 'destructive'; label: string }
  > = {
    LOW: { variant: 'secondary', label: 'Low' },
    MEDIUM: { variant: 'default', label: 'Medium' },
    HIGH: { variant: 'destructive', label: 'High' },
  }

  const { variant, label } = config[priority] || config.LOW

  return (
    <Badge variant={variant} className="text-xs">
      {label}
    </Badge>
  )
}

function getPriorityColor(priority: NotificationPriority) {
  switch (priority) {
    case 'HIGH':
      return { border: 'border-l-red-500' }
    case 'MEDIUM':
      return { border: 'border-l-yellow-500' }
    case 'LOW':
      return { border: 'border-l-blue-500' }
    default:
      return { border: 'border-l-gray-500' }
  }
}

/**
 * Compact widget version for dashboard
 */
export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUnreadCount()
  }, [])

  const loadUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications?unreadOnly=true&limit=1')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
      console.error('Error loading unread count:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="sm" className="relative">
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  )
}
