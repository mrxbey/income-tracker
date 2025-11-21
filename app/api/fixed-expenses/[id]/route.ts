import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/prisma'
import { updateFixedExpenseSchema } from '@/lib/validations'
import { applyRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { Decimal } from 'decimal.js'

/**
 * GET /api/fixed-expenses/[id]
 * Fetch a single fixed expense by ID
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

    const fixedExpense = await prisma.fixedExpense.findFirst({
      where: {
        id: params.id,
        userId: session.userId,
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

    if (!fixedExpense) {
      return NextResponse.json({ error: 'Fixed expense not found' }, { status: 404 })
    }

    return NextResponse.json(
      { fixedExpense },
      {
        headers: getRateLimitHeaders('READ', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error fetching fixed expense:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch fixed expense',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/fixed-expenses/[id]
 * Replace a fixed expense (full update)
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
    const existingExpense = await prisma.fixedExpense.findFirst({
      where: {
        id: params.id,
        userId: session.userId,
      },
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Fixed expense not found' }, { status: 404 })
    }

    const body = await req.json()

    // Validate request body
    const validatedData = updateFixedExpenseSchema.parse(body)

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

    // Update fixed expense
    const updatedExpense = await prisma.fixedExpense.update({
      where: { id: params.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.amount !== undefined && { amount: new Decimal(validatedData.amount) }),
        ...(validatedData.currency && { currency: validatedData.currency }),
        ...(validatedData.period && { period: validatedData.period }),
        ...(validatedData.interval !== undefined && { interval: validatedData.interval }),
        ...(validatedData.nextDueAt && { nextDueAt: new Date(validatedData.nextDueAt) }),
        ...(validatedData.accountId !== undefined && { accountId: validatedData.accountId }),
        ...(validatedData.categoryId !== undefined && { categoryId: validatedData.categoryId }),
        ...(validatedData.lifeDomain !== undefined && { lifeDomain: validatedData.lifeDomain }),
        ...(validatedData.countryCode !== undefined && { countryCode: validatedData.countryCode }),
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
      { fixedExpense: updatedExpense },
      {
        headers: getRateLimitHeaders('MUTATION', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error updating fixed expense:', error)

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
        error: 'Failed to update fixed expense',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/fixed-expenses/[id]
 * Partially update a fixed expense
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
    const existingExpense = await prisma.fixedExpense.findFirst({
      where: {
        id: params.id,
        userId: session.userId,
      },
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Fixed expense not found' }, { status: 404 })
    }

    const body = await req.json()

    // For PATCH, we allow partial updates including just isActive
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.amount !== undefined) updateData.amount = new Decimal(body.amount)
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.period !== undefined) updateData.period = body.period
    if (body.interval !== undefined) updateData.interval = body.interval
    if (body.nextDueAt !== undefined) updateData.nextDueAt = new Date(body.nextDueAt)
    if (body.accountId !== undefined) updateData.accountId = body.accountId
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId
    if (body.lifeDomain !== undefined) updateData.lifeDomain = body.lifeDomain
    if (body.countryCode !== undefined) updateData.countryCode = body.countryCode
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    // Update fixed expense
    const updatedExpense = await prisma.fixedExpense.update({
      where: { id: params.id },
      data: updateData,
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
      { fixedExpense: updatedExpense },
      {
        headers: getRateLimitHeaders('MUTATION', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error patching fixed expense:', error)
    return NextResponse.json(
      {
        error: 'Failed to update fixed expense',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/fixed-expenses/[id]
 * Delete a fixed expense
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
    const existingExpense = await prisma.fixedExpense.findFirst({
      where: {
        id: params.id,
        userId: session.userId,
      },
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Fixed expense not found' }, { status: 404 })
    }

    // Delete fixed expense
    await prisma.fixedExpense.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { success: true, message: 'Fixed expense deleted successfully' },
      {
        headers: getRateLimitHeaders('MUTATION', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } catch (error) {
    console.error('Error deleting fixed expense:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete fixed expense',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
