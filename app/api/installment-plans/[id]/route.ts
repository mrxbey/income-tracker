import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/prisma'
import { updateInstallmentPlanSchema } from '@/lib/validations'
import { applyRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { Decimal } from 'decimal.js'

/**
 * GET /api/installment-plans/[id]
 * Fetch a single installment plan by ID
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    const installmentPlan = await prisma.installmentPlan.findFirst({
      where: {
        id: params.id,
        userId: session.userId,
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
    })

    if (!installmentPlan) {
      return NextResponse.json({ error: 'Installment plan not found' }, { status: 404 })
    }

    return NextResponse.json(
      { installmentPlan },
      {
        headers: getRateLimitHeaders('READ', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error fetching installment plan:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch installment plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/installment-plans/[id]
 * Replace an installment plan (full update)
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Verify ownership
    const existingPlan = await prisma.installmentPlan.findFirst({
      where: {
        id: params.id,
        userId: session.userId,
      },
    })

    if (!existingPlan) {
      return NextResponse.json({ error: 'Installment plan not found' }, { status: 404 })
    }

    const body = await req.json()

    // Validate request body
    const validatedData = updateInstallmentPlanSchema.parse(body)

    // Verify card account ownership if being updated
    if (validatedData.cardAccountId) {
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
    }

    // Update installment plan
    const updatedPlan = await prisma.installmentPlan.update({
      where: { id: params.id },
      data: {
        ...(validatedData.cardAccountId && { cardAccountId: validatedData.cardAccountId }),
        ...(validatedData.merchant !== undefined && { merchant: validatedData.merchant }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.totalAmount !== undefined && {
          totalAmount: new Decimal(validatedData.totalAmount),
        }),
        ...(validatedData.numInstallments !== undefined && {
          numInstallments: validatedData.numInstallments,
        }),
        ...(validatedData.installmentAmount !== undefined && {
          installmentAmount: new Decimal(validatedData.installmentAmount),
        }),
        ...(validatedData.firstDueAt && { firstDueAt: new Date(validatedData.firstDueAt) }),
        ...(validatedData.frequencyDays !== undefined && {
          frequencyDays: validatedData.frequencyDays,
        }),
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
    })

    return NextResponse.json(
      { installmentPlan: updatedPlan },
      {
        headers: getRateLimitHeaders('MUTATION', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error updating installment plan:', error)

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
        error: 'Failed to update installment plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/installment-plans/[id]
 * Partially update an installment plan (e.g., mark installment as paid)
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Verify ownership
    const existingPlan = await prisma.installmentPlan.findFirst({
      where: {
        id: params.id,
        userId: session.userId,
      },
    })

    if (!existingPlan) {
      return NextResponse.json({ error: 'Installment plan not found' }, { status: 404 })
    }

    const body = await req.json()

    // For PATCH, allow partial updates including remainingInstallments
    const updateData: any = {}

    if (body.merchant !== undefined) updateData.merchant = body.merchant
    if (body.description !== undefined) updateData.description = body.description
    if (body.totalAmount !== undefined) updateData.totalAmount = new Decimal(body.totalAmount)
    if (body.numInstallments !== undefined) updateData.numInstallments = body.numInstallments
    if (body.installmentAmount !== undefined)
      updateData.installmentAmount = new Decimal(body.installmentAmount)
    if (body.firstDueAt !== undefined) updateData.firstDueAt = new Date(body.firstDueAt)
    if (body.frequencyDays !== undefined) updateData.frequencyDays = body.frequencyDays
    if (body.remainingInstallments !== undefined)
      updateData.remainingInstallments = body.remainingInstallments
    if (body.reviewStatus !== undefined) updateData.reviewStatus = body.reviewStatus

    // Update installment plan
    const updatedPlan = await prisma.installmentPlan.update({
      where: { id: params.id },
      data: updateData,
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
    })

    return NextResponse.json(
      { installmentPlan: updatedPlan },
      {
        headers: getRateLimitHeaders('MUTATION', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error patching installment plan:', error)
    return NextResponse.json(
      {
        error: 'Failed to update installment plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/installment-plans/[id]
 * Delete an installment plan
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Verify ownership
    const existingPlan = await prisma.installmentPlan.findFirst({
      where: {
        id: params.id,
        userId: session.userId,
      },
    })

    if (!existingPlan) {
      return NextResponse.json({ error: 'Installment plan not found' }, { status: 404 })
    }

    // Delete installment plan
    await prisma.installmentPlan.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { success: true, message: 'Installment plan deleted successfully' },
      {
        headers: getRateLimitHeaders('MUTATION', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error deleting installment plan:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete installment plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
