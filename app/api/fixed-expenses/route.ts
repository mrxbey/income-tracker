import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/prisma'
import { createFixedExpenseSchema } from '@/lib/validations'
import { applyRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { Decimal } from 'decimal.js'

/**
 * GET /api/fixed-expenses
 * Fetch all fixed expenses for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting
    const rateLimitResult = applyRateLimit(req, 'READ')
    if (!rateLimitResult.success) {
      return rateLimitResult.response
    }

    const { searchParams } = new URL(req.url)
    const isActive = searchParams.get('isActive')

    const fixedExpenses = await prisma.fixedExpense.findMany({
      where: {
        userId: session.userId,
        ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            currency: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            icon: true,
            color: true,
          },
        },
      },
      orderBy: {
        nextDueAt: 'asc',
      },
    })

    return NextResponse.json(
      { fixedExpenses },
      {
        headers: getRateLimitHeaders('READ', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error fetching fixed expenses:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch fixed expenses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/fixed-expenses
 * Create a new fixed expense
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting
    const rateLimitResult = applyRateLimit(req, 'MUTATION')
    if (!rateLimitResult.success) {
      return rateLimitResult.response
    }

    const body = await req.json()

    // Validate request body
    const validatedData = createFixedExpenseSchema.parse(body)

    // Verify account ownership if accountId is provided
    if (validatedData.accountId) {
      const account = await prisma.account.findFirst({
        where: {
          id: validatedData.accountId,
          userId: session.userId,
        },
      })

      if (!account) {
        return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 })
      }
    }

    // Verify category ownership if categoryId is provided
    if (validatedData.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: validatedData.categoryId,
          userId: session.userId,
        },
      })

      if (!category) {
        return NextResponse.json({ error: 'Category not found or unauthorized' }, { status: 404 })
      }
    }

    // Create fixed expense
    const fixedExpense = await prisma.fixedExpense.create({
      data: {
        userId: session.userId,
        name: validatedData.name,
        amount: new Decimal(validatedData.amount),
        currency: validatedData.currency,
        period: validatedData.period,
        interval: validatedData.interval,
        nextDueAt: new Date(validatedData.nextDueAt),
        accountId: validatedData.accountId,
        categoryId: validatedData.categoryId,
        lifeDomain: validatedData.lifeDomain,
        countryCode: validatedData.countryCode,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            currency: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            icon: true,
            color: true,
          },
        },
      },
    })

    return NextResponse.json(
      { fixedExpense },
      {
        status: 201,
        headers: getRateLimitHeaders('MUTATION', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error creating fixed expense:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create fixed expense',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
