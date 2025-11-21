import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/prisma'
import { createInstallmentPlanSchema } from '@/lib/validations'
import { applyRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { Decimal } from 'decimal.js'

/**
 * GET /api/installment-plans
 * Fetch all installment plans for the authenticated user
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
    const cardAccountId = searchParams.get('cardAccountId')

    const installmentPlans = await prisma.installmentPlan.findMany({
      where: {
        userId: session.userId,
        ...(cardAccountId ? { cardAccountId } : {}),
      },
      include: {
        cardAccount: {
          select: {
            id: true,
            name: true,
            type: true,
            currency: true,
          },
        },
        transactions: {
          select: {
            id: true,
            amount: true,
            postedAt: true,
            description: true,
          },
          orderBy: {
            postedAt: 'desc',
          },
        },
      },
      orderBy: {
        firstDueAt: 'asc',
      },
    })

    return NextResponse.json(
      { installmentPlans },
      {
        headers: getRateLimitHeaders('READ', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error fetching installment plans:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch installment plans',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/installment-plans
 * Create a new installment plan
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
    const validatedData = createInstallmentPlanSchema.parse(body)

    // Verify card account ownership
    const cardAccount = await prisma.account.findFirst({
      where: {
        id: validatedData.cardAccountId,
        userId: session.userId,
        type: 'CREDIT_CARD',
      },
    })

    if (!cardAccount) {
      return NextResponse.json(
        { error: 'Credit card account not found or unauthorized' },
        { status: 404 }
      )
    }

    // Create installment plan
    const installmentPlan = await prisma.installmentPlan.create({
      data: {
        userId: session.userId,
        cardAccountId: validatedData.cardAccountId,
        merchant: validatedData.merchant,
        description: validatedData.description,
        totalAmount: new Decimal(validatedData.totalAmount),
        numInstallments: validatedData.numInstallments,
        installmentAmount: new Decimal(validatedData.installmentAmount),
        firstDueAt: new Date(validatedData.firstDueAt),
        frequencyDays: validatedData.frequencyDays,
        remainingInstallments: validatedData.numInstallments, // Initially all remain
        source: validatedData.source,
        confidence: 1.0,
      },
      include: {
        cardAccount: {
          select: {
            id: true,
            name: true,
            type: true,
            currency: true,
          },
        },
        transactions: true,
      },
    })

    return NextResponse.json(
      { installmentPlan },
      {
        status: 201,
        headers: getRateLimitHeaders('MUTATION', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error creating installment plan:', error)

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
        error: 'Failed to create installment plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
