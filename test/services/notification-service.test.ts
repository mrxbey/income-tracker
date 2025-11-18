import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/services/notification-service'
import { db as prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  db: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'BUDGET_ALERT',
        priority: 'HIGH',
        title: 'Budget Alert',
        message: 'You have exceeded your budget',
        actionUrl: '/budgets',
        actionText: 'View Budget',
        metadata: { budgetId: 'budget-1' },
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification as any)

      const result = await createNotification({
        userId: 'user-1',
        type: 'BUDGET_ALERT',
        priority: 'HIGH',
        title: 'Budget Alert',
        message: 'You have exceeded your budget',
        actionUrl: '/budgets',
        actionText: 'View Budget',
        metadata: { budgetId: 'budget-1' },
      })

      expect(result.id).toBe('notif-1')
      expect(result.type).toBe('BUDGET_ALERT')
      expect(result.priority).toBe('HIGH')
      expect(result.read).toBe(false)
      expect(prisma.notification.create).toHaveBeenCalledTimes(1)
    })

    it('should handle notification without metadata', async () => {
      const mockNotification = {
        id: 'notif-2',
        userId: 'user-1',
        type: 'SYSTEM',
        priority: 'LOW',
        title: 'System Update',
        message: 'System updated',
        actionUrl: null,
        actionText: null,
        metadata: null,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification as any)

      const result = await createNotification({
        userId: 'user-1',
        type: 'SYSTEM',
        priority: 'LOW',
        title: 'System Update',
        message: 'System updated',
      })

      expect(result.id).toBe('notif-2')
      expect(result.metadata).toBeUndefined()
    })
  })

  describe('getNotifications', () => {
    it('should get all notifications for a user', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'BUDGET_ALERT',
          priority: 'HIGH',
          title: 'Budget Alert',
          message: 'Budget exceeded',
          actionUrl: '/budgets',
          actionText: 'View',
          metadata: null,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications as any)
      vi.mocked(prisma.notification.count).mockResolvedValue(1)

      const result = await getNotifications('user-1', { limit: 10 })

      expect(result.notifications).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.unreadCount).toBe(1)
    })

    it('should filter unread notifications only', async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([])
      vi.mocked(prisma.notification.count).mockResolvedValue(0)

      await getNotifications('user-1', { unreadOnly: true })

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ read: false }),
        })
      )
    })
  })

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 } as any)

      const result = await markNotificationAsRead('notif-1', 'user-1')

      expect(result).toBe(true)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { read: true },
      })
    })
  })

  describe('markAllNotificationsAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 } as any)

      const result = await markAllNotificationsAsRead('user-1')

      expect(result).toBe(5)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        data: { read: true },
      })
    })
  })
})
