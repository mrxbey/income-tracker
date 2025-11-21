import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/prisma'
import { applyRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { z } from 'zod'

// Validation schemas
const bulkDeleteSchema = z.object({
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required').max(100, 'Maximum 100 transactions at once'),
})

const bulkCategorizeSchema = z.object({
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required').max(100, 'Maximum 100 transactions at once'),
  categoryId: z.string().min(1, 'Category ID is required'),
})

const bulkTagSchema = z.object({
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required').max(100, 'Maximum 100 transactions at once'),
  tagIds: z.array(z.string()).min(1, 'At least one tag ID is required'),
  action: z.enum(['add', 'remove']),
})

/**
 * POST /api/transactions/bulk
 * Bulk operations on transactions
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

    const { searchParams } = new URL(req.url)
    const operation = searchParams.get('operation')

    const body = await req.json()

    switch (operation) {
      case 'delete':
        return await handleBulkDelete(session.userId, body, rateLimitResult)

      case 'categorize':
        return await handleBulkCategorize(session.userId, body, rateLimitResult)

      case 'tag':
        return await handleBulkTag(session.userId, body, rateLimitResult)

      default:
        return NextResponse.json(
          { error: 'Invalid operation. Use: delete, categorize, or tag' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in bulk operations:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map((e) => e.message).join(', '),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to perform bulk operation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Bulk delete transactions
 */
async function handleBulkDelete(
  userId: string,
  body: unknown,
  rateLimitResult: { remaining: number; reset: number }
) {
  const validated = bulkDeleteSchema.parse(body)

  // Verify ownership of all transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      id: { in: validated.transactionIds },
    },
    include: {
      account: {
        select: {
          userId: true,
        },
      },
    },
  })

  // Check that all transactions belong to the user
  const unauthorizedTransactions = transactions.filter(
    (txn) => txn.account.userId !== userId
  )

  if (unauthorizedTransactions.length > 0) {
    return NextResponse.json(
      { error: 'Unauthorized: Some transactions do not belong to you' },
      { status: 403 }
    )
  }

  // Delete transactions in a transaction (for atomicity)
  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.transaction.deleteMany({
      where: {
        id: { in: validated.transactionIds },
        account: {
          userId,
        },
      },
    })

    return deleted
  })

  return NextResponse.json(
    {
      success: true,
      deletedCount: result.count,
      message: `Successfully deleted ${result.count} transaction(s)`,
    },
    {
      headers: getRateLimitHeaders('MUTATION', rateLimitResult.remaining, rateLimitResult.reset),
    }
  )
}

/**
 * Bulk categorize transactions
 */
async function handleBulkCategorize(
  userId: string,
  body: unknown,
  rateLimitResult: { remaining: number; reset: number }
) {
  const validated = bulkCategorizeSchema.parse(body)

  // Verify category ownership
  const category = await prisma.category.findFirst({
    where: {
      id: validated.categoryId,
      userId,
    },
  })

  if (!category) {
    return NextResponse.json(
      { error: 'Category not found or unauthorized' },
      { status: 404 }
    )
  }

  // Verify ownership of all transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      id: { in: validated.transactionIds },
    },
    include: {
      account: {
        select: {
          userId: true,
        },
      },
    },
  })

  const unauthorizedTransactions = transactions.filter(
    (txn) => txn.account.userId !== userId
  )

  if (unauthorizedTransactions.length > 0) {
    return NextResponse.json(
      { error: 'Unauthorized: Some transactions do not belong to you' },
      { status: 403 }
    )
  }

  // Update transactions
  const result = await prisma.transaction.updateMany({
    where: {
      id: { in: validated.transactionIds },
      account: {
        userId,
      },
    },
    data: {
      categoryId: validated.categoryId,
    },
  })

  return NextResponse.json(
    {
      success: true,
      updatedCount: result.count,
      message: `Successfully categorized ${result.count} transaction(s)`,
      category: {
        id: category.id,
        name: category.name,
      },
    },
    {
      headers: getRateLimitHeaders('MUTATION', rateLimitResult.remaining, rateLimitResult.reset),
    }
  )
}

/**
 * Bulk tag transactions
 */
async function handleBulkTag(
  userId: string,
  body: unknown,
  rateLimitResult: { remaining: number; reset: number }
) {
  const validated = bulkTagSchema.parse(body)

  // Verify tag ownership
  const tags = await prisma.tag.findMany({
    where: {
      id: { in: validated.tagIds },
      userId,
    },
  })

  if (tags.length !== validated.tagIds.length) {
    return NextResponse.json(
      { error: 'Some tags not found or unauthorized' },
      { status: 404 }
    )
  }

  // Verify ownership of all transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      id: { in: validated.transactionIds },
    },
    include: {
      account: {
        select: {
          userId: true,
        },
      },
    },
  })

  const unauthorizedTransactions = transactions.filter(
    (txn) => txn.account.userId !== userId
  )

  if (unauthorizedTransactions.length > 0) {
    return NextResponse.json(
      { error: 'Unauthorized: Some transactions do not belong to you' },
      { status: 403 }
    )
  }

  // Perform tag operation
  let result
  if (validated.action === 'add') {
    // Add tags to transactions
    const tagsToCreate = validated.transactionIds.flatMap((transactionId) =>
      validated.tagIds.map((tagId) => ({
        transactionId,
        tagId,
        source: 'USER' as const,
        confidence: 1.0,
      }))
    )

    result = await prisma.transactionTag.createMany({
      data: tagsToCreate,
      skipDuplicates: true,
    })

    return NextResponse.json(
      {
        success: true,
        addedCount: result.count,
        message: `Successfully added tags to ${validated.transactionIds.length} transaction(s)`,
      },
      {
        headers: getRateLimitHeaders('MUTATION', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  } else {
    // Remove tags from transactions
    result = await prisma.transactionTag.deleteMany({
      where: {
        transactionId: { in: validated.transactionIds },
        tagId: { in: validated.tagIds },
      },
    })

    return NextResponse.json(
      {
        success: true,
        removedCount: result.count,
        message: `Successfully removed tags from transactions`,
      },
      {
        headers: getRateLimitHeaders('MUTATION', rateLimitResult.remaining, rateLimitResult.reset),
      }
    )
  }
}
