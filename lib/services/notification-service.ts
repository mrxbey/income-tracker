import { db as prisma } from '@/lib/prisma'

export type NotificationType =
  | 'BUDGET_ALERT'
  | 'GOAL_PROGRESS'
  | 'SPENDING_ALERT'
  | 'RECURRING_PATTERN'
  | 'FIXED_EXPENSE_DUE'
  | 'WEEKLY_INSIGHT'
  | 'SYSTEM'

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  actionUrl?: string
  actionText?: string
  metadata?: Record<string, unknown>
  read: boolean
  createdAt: Date
}

interface CreateNotificationInput {
  userId: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  actionUrl?: string
  actionText?: string
  metadata?: Record<string, unknown>
}

/**
 * Create a new notification for a user
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      priority: input.priority,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl || null,
      actionText: input.actionText || null,
      metadata: input.metadata ? (input.metadata as any) : undefined,
      read: false,
    },
  })

  return {
    id: notification.id,
    type: notification.type as NotificationType,
    priority: notification.priority as NotificationPriority,
    title: notification.title,
    message: notification.message,
    actionUrl: notification.actionUrl || undefined,
    actionText: notification.actionText || undefined,
    metadata: (notification.metadata as Record<string, unknown>) || undefined,
    read: notification.read,
    createdAt: notification.createdAt,
  }
}

/**
 * Get all notifications for a user
 */
export async function getNotifications(
  userId: string,
  options?: {
    unreadOnly?: boolean
    limit?: number
    offset?: number
  }
): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
  const where = {
    userId,
    ...(options?.unreadOnly ? { read: false } : {}),
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, read: false } }),
  ])

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type as NotificationType,
      priority: n.priority as NotificationPriority,
      title: n.title,
      message: n.message,
      actionUrl: n.actionUrl || undefined,
      actionText: n.actionText || undefined,
      metadata: (n.metadata as Record<string, unknown>) || undefined,
      read: n.read,
      createdAt: n.createdAt,
    })),
    total,
    unreadCount,
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
      },
    })
    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  })

  return result.count
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  try {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    })
    return true
  } catch (error) {
    console.error('Error deleting notification:', error)
    return false
  }
}

/**
 * Delete all read notifications
 */
export async function deleteReadNotifications(userId: string): Promise<number> {
  const result = await prisma.notification.deleteMany({
    where: {
      userId,
      read: true,
    },
  })

  return result.count
}

/**
 * Generate budget alert notifications
 */
export async function generateBudgetAlertNotifications(userId: string): Promise<void> {
  try {
    // Get budgets that are near or over limit
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        category: true,
      },
    })

    // Get spending for current month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const spending = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        account: { userId },
        type: 'EXPENSE',
        postedAt: { gte: monthStart, lte: monthEnd },
        categoryId: { in: budgets.map((b) => b.categoryId) },
      },
      _sum: { amount: true },
    })

    const spendingMap: Record<string, number> = {}
    for (const s of spending) {
      if (s.categoryId) {
        spendingMap[s.categoryId] = Math.abs(Number(s._sum.amount))
      }
    }

    for (const budget of budgets) {
      const spent = spendingMap[budget.categoryId] || 0
      const amount = Number(budget.amount)
      const percentage = (spent / amount) * 100

      // Alert at 80%, 90%, 100%, 110%
      if (percentage >= 80) {
        const existingAlert = await prisma.notification.findFirst({
          where: {
            userId,
            type: 'BUDGET_ALERT',
            metadata: {
              path: ['budgetId'],
              equals: budget.id,
            },
            read: false,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        })

        if (!existingAlert) {
          let priority: NotificationPriority = 'MEDIUM'
          let title = ''

          if (percentage >= 110) {
            priority = 'HIGH'
            title = `Budget Exceeded: ${budget.category.name}`
          } else if (percentage >= 100) {
            priority = 'HIGH'
            title = `Budget Limit Reached: ${budget.category.name}`
          } else if (percentage >= 90) {
            priority = 'MEDIUM'
            title = `Budget Alert: ${budget.category.name}`
          } else {
            priority = 'LOW'
            title = `Budget Warning: ${budget.category.name}`
          }

          await createNotification({
            userId,
            type: 'BUDGET_ALERT',
            priority,
            title,
            message: `You've spent ${percentage.toFixed(0)}% of your ${budget.category.name} budget (${budget.currency}${spent.toFixed(2)} of ${budget.currency}${amount.toFixed(2)})`,
            actionUrl: '/budgets',
            actionText: 'View Budget',
            metadata: {
              budgetId: budget.id,
              percentage,
            },
          })
        }
      }
    }
  } catch (error) {
    console.error('Error generating budget alert notifications:', error)
  }
}

/**
 * Generate goal progress notifications
 */
export async function generateGoalProgressNotifications(userId: string): Promise<void> {
  try {
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        isCompleted: false,
      },
    })

    for (const goal of goals) {
      const currentAmount = Number(goal.currentAmount)
      const targetAmount = Number(goal.targetAmount)
      const percentage = (currentAmount / targetAmount) * 100

      // Notify at milestones: 25%, 50%, 75%, 90%, 100%
      const milestones = [25, 50, 75, 90, 100]
      const reachedMilestone = milestones.find((m) => percentage >= m && percentage < m + 5)

      if (reachedMilestone) {
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId,
            type: 'GOAL_PROGRESS',
            metadata: {
              path: ['goalId'],
              equals: goal.id,
            },
            read: false,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        })

        if (!existingNotif) {
          await createNotification({
            userId,
            type: 'GOAL_PROGRESS',
            priority: reachedMilestone === 100 ? 'HIGH' : 'MEDIUM',
            title: reachedMilestone === 100 ? `Goal Achieved: ${goal.name}! 🎉` : `Goal Progress: ${goal.name}`,
            message:
              reachedMilestone === 100
                ? `Congratulations! You've reached your goal of ${goal.currency}${targetAmount.toFixed(2)}`
                : `You're ${reachedMilestone}% of the way to your goal! ${goal.currency}${currentAmount.toFixed(2)} of ${goal.currency}${targetAmount.toFixed(2)}`,
            actionUrl: '/goals',
            actionText: 'View Goal',
            metadata: {
              goalId: goal.id,
              percentage,
              milestone: reachedMilestone,
            },
          })
        }
      }
    }
  } catch (error) {
    console.error('Error generating goal progress notifications:', error)
  }
}

/**
 * Generate fixed expense due notifications
 */
export async function generateFixedExpenseDueNotifications(userId: string): Promise<void> {
  try {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    const upcomingExpenses = await prisma.fixedExpense.findMany({
      where: {
        userId,
        nextDueAt: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
      include: {
        category: true,
      },
    })

    for (const expense of upcomingExpenses) {
      const existingNotif = await prisma.notification.findFirst({
        where: {
          userId,
          type: 'FIXED_EXPENSE_DUE',
          metadata: {
            path: ['expenseId'],
            equals: expense.id,
          },
          read: false,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      })

      if (!existingNotif) {
        const daysUntilDue = Math.ceil(
          (expense.nextDueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        await createNotification({
          userId,
          type: 'FIXED_EXPENSE_DUE',
          priority: daysUntilDue <= 1 ? 'HIGH' : 'MEDIUM',
          title: `Upcoming Payment: ${expense.name}`,
          message: `Your ${expense.name} payment of ${expense.currency}${Number(expense.amount).toFixed(2)} is due ${daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}`,
          actionUrl: '/fixed-expenses',
          actionText: 'View Expenses',
          metadata: {
            expenseId: expense.id,
            dueDate: expense.nextDueAt.toISOString(),
            daysUntilDue,
          },
        })
      }
    }
  } catch (error) {
    console.error('Error generating fixed expense due notifications:', error)
  }
}
