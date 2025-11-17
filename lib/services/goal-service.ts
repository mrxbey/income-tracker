import { db as prisma } from '@/lib/prisma'

export interface GoalWithProgress {
  id: string
  name: string
  description: string | null
  targetAmount: number
  currentAmount: number
  currency: string
  targetDate: Date | null
  accountId: string | null
  accountName: string | null
  isCompleted: boolean
  completedAt: Date | null
  progressPercentage: number
  remainingAmount: number
  daysRemaining: number | null
  recommendedMonthlyContribution: number | null
  createdAt: Date
}

/**
 * Get all goals for a user
 */
export async function getUserGoals(userId: string): Promise<GoalWithProgress[]> {
  const goals = await prisma.goal.findMany({
    where: {
      userId,
    },
    include: {
      account: true,
    },
    orderBy: [
      { isCompleted: 'asc' },
      { targetDate: 'asc' },
    ],
  })

  const now = new Date()

  return goals.map((goal) => {
    const targetAmount = Number(goal.targetAmount)
    const currentAmount = Number(goal.currentAmount)
    const remainingAmount = targetAmount - currentAmount
    const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0

    let daysRemaining: number | null = null
    let recommendedMonthlyContribution: number | null = null

    if (goal.targetDate) {
      daysRemaining = Math.max(0, Math.ceil((goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      const monthsRemaining = Math.max(1, daysRemaining / 30)
      recommendedMonthlyContribution = remainingAmount / monthsRemaining
    }

    return {
      id: goal.id,
      name: goal.name,
      description: goal.description,
      targetAmount,
      currentAmount,
      currency: goal.currency,
      targetDate: goal.targetDate,
      accountId: goal.accountId,
      accountName: goal.account?.name || null,
      isCompleted: goal.isCompleted,
      completedAt: goal.completedAt,
      progressPercentage,
      remainingAmount,
      daysRemaining,
      recommendedMonthlyContribution,
      createdAt: goal.createdAt,
    }
  })
}

/**
 * Create a new goal
 */
export async function createGoal(
  userId: string,
  data: {
    name: string
    description?: string | null
    targetAmount: number
    currentAmount?: number
    currency: string
    targetDate?: Date | null
    accountId?: string | null
  }
) {
  return await prisma.goal.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount || 0,
      currency: data.currency,
      targetDate: data.targetDate,
      accountId: data.accountId,
    },
  })
}

/**
 * Update goal progress
 */
export async function updateGoalProgress(
  userId: string,
  goalId: string,
  newCurrentAmount: number
) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId, userId },
  })

  if (!goal) {
    throw new Error('Goal not found')
  }

  const targetAmount = Number(goal.targetAmount)
  const isCompleted = newCurrentAmount >= targetAmount

  return await prisma.goal.update({
    where: { id: goalId, userId },
    data: {
      currentAmount: newCurrentAmount,
      isCompleted,
      completedAt: isCompleted && !goal.isCompleted ? new Date() : goal.completedAt,
    },
  })
}

/**
 * Delete a goal
 */
export async function deleteGoal(userId: string, goalId: string) {
  await prisma.goal.delete({
    where: { id: goalId, userId },
  })
}
