import { createEvents, EventAttributes } from 'ics'
import { db as prisma } from '@/lib/prisma'
import { Period } from '@prisma/client'

export interface CalendarEvent {
  title: string
  description?: string
  start: Date
  end: Date
  location?: string
  url?: string
  category?: string
  alarm?: {
    description: string
    trigger: {
      hours: number
      minutes: number
      before: boolean
    }
  }
}

/**
 * Generate iCal file for user's financial events
 */
export async function generateFinancialCalendar(
  userId: string,
  options: {
    includeSubscriptions?: boolean
    includeBills?: boolean
    includeGoals?: boolean
    includeBudgets?: boolean
    monthsAhead?: number
  } = {}
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const {
      includeSubscriptions = true,
      includeBills = true,
      includeGoals = true,
      includeBudgets = true,
      monthsAhead = 12,
    } = options

    const events: EventAttributes[] = []
    const now = new Date()
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + monthsAhead)

    // Get subscriptions and fixed expenses
    if (includeSubscriptions || includeBills) {
      const fixedExpenses = await prisma.fixedExpense.findMany({
        where: {
          userId,
          isActive: true,
          nextDueAt: {
            lte: futureDate,
          },
        },
        include: {
          category: true,
        },
      })

      for (const expense of fixedExpenses) {
        const occurrences = generateRecurringOccurrences(
          expense.nextDueAt,
          expense.period,
          monthsAhead
        )

        for (const date of occurrences) {
          const event: EventAttributes = {
            start: dateToArray(date),
            end: dateToArray(addMinutes(date, 30)), // 30-minute event
            title: `${expense.name} - ${expense.currency} ${expense.amount}`,
            description: `Bill payment for ${expense.name}\nAmount: ${expense.currency} ${expense.amount}\nFrequency: ${expense.period.toLowerCase()}${expense.category ? `\nCategory: ${expense.category.name}` : ''}`,
            categories: expense.category ? [expense.category.name] : ['Bill'],
            status: 'CONFIRMED',
            busyStatus: 'FREE',
            alarms: [
              {
                action: 'display',
                description: `${expense.name} payment due`,
                trigger: {
                  hours: 72, // 3 days before
                  before: true,
                },
              },
            ],
          }

          events.push(event)
        }
      }
    }

    // Get goals with deadlines
    if (includeGoals) {
      const goals = await prisma.goal.findMany({
        where: {
          userId,
          targetDate: {
            gte: now,
            lte: futureDate,
          },
        },
      })

      for (const goal of goals) {
        if (!goal.targetDate) continue

        const event: EventAttributes = {
          start: dateToArray(goal.targetDate),
          end: dateToArray(addMinutes(goal.targetDate, 60)),
          title: `Goal: ${goal.name}`,
          description: `Financial goal deadline\nTarget amount: ${goal.currency} ${goal.targetAmount}\nCurrent amount: ${goal.currency} ${goal.currentAmount}\nProgress: ${calculateProgress(Number(goal.currentAmount), Number(goal.targetAmount))}%${goal.description ? `\n\n${goal.description}` : ''}`,
          categories: ['Goal'],
          status: 'CONFIRMED',
          busyStatus: 'FREE',
          alarms: [
            {
              action: 'display',
              description: `Goal deadline: ${goal.name}`,
              trigger: {
                hours: 24 * 7, // 1 week before
                before: true,
              },
            },
          ],
        }

        events.push(event)
      }
    }

    // Get budget review dates (monthly)
    if (includeBudgets) {
      const budgets = await prisma.budget.findMany({
        where: {
          userId,
        },
        include: {
          category: true,
        },
      })

      if (budgets.length > 0) {
        // Generate monthly budget review events
        for (let i = 0; i < monthsAhead; i++) {
          const reviewDate = new Date(now)
          reviewDate.setMonth(reviewDate.getMonth() + i)
          reviewDate.setDate(1) // First of the month

          const event: EventAttributes = {
            start: dateToArray(reviewDate),
            end: dateToArray(addMinutes(reviewDate, 60)),
            title: 'Monthly Budget Review',
            description: `Review your monthly budget and spending\n\nActive budgets:\n${budgets
              .map((b) => `- ${b.category.name}: ${b.currency} ${b.amount}`)
              .join('\n')}`,
            categories: ['Budget'],
            status: 'CONFIRMED',
            busyStatus: 'FREE',
            alarms: [
              {
                action: 'display',
                description: 'Monthly budget review',
                trigger: {
                  hours: 24,
                  before: true,
                },
              },
            ],
          }

          events.push(event)
        }
      }
    }

    // Generate iCal file
    const { error, value } = createEvents(events)

    if (error) {
      console.error('Error creating calendar:', error)
      return {
        success: false,
        error: 'Failed to generate calendar',
      }
    }

    return {
      success: true,
      data: value,
    }
  } catch (error) {
    console.error('Error generating financial calendar:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate Google Calendar URL for a specific event
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE'

  const params = new URLSearchParams({
    text: event.title,
    dates: `${formatGoogleDate(event.start)}/${formatGoogleDate(event.end)}`,
    details: event.description || '',
    location: event.location || '',
  })

  return `${baseUrl}&${params.toString()}`
}

/**
 * Generate calendar subscribe URL for continuous sync
 */
export function generateCalendarSubscribeUrl(userId: string, token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/calendar/subscribe?userId=${userId}&token=${token}`
}

// Helper functions

function dateToArray(date: Date): [number, number, number, number, number] {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ]
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}

function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0
  return Math.min(Math.round((current / target) * 100), 100)
}

function generateRecurringOccurrences(
  startDate: Date,
  frequency: Period,
  monthsAhead: number
): Date[] {
  const occurrences: Date[] = []
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + monthsAhead)

  let currentDate = new Date(startDate)

  while (currentDate <= endDate && occurrences.length < 100) {
    // Safety limit
    occurrences.push(new Date(currentDate))

    switch (frequency) {
      case Period.WEEKLY:
        currentDate.setDate(currentDate.getDate() + 7)
        break
      case Period.MONTHLY:
        currentDate.setMonth(currentDate.getMonth() + 1)
        break
      case Period.QUARTERLY:
        currentDate.setMonth(currentDate.getMonth() + 3)
        break
      case Period.YEARLY:
        currentDate.setFullYear(currentDate.getFullYear() + 1)
        break
    }
  }

  return occurrences
}
