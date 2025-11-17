import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { transactionService } from '@/lib/services/transaction-service'
import { createTransactionSchema, transactionQuerySchema } from '@/lib/validations'
import { handleError, UnauthorizedError } from '@/lib/errors'

/**
 * GET /api/transactions
 * List all transactions for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new UnauthorizedError()
    }

    const searchParams = req.nextUrl.searchParams
    const query = transactionQuerySchema.parse({
      accountId: searchParams.get('accountId') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      tagId: searchParams.get('tagId') || undefined,
      type: searchParams.get('type') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
      minAmount: searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined,
      maxAmount: searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    })

    const result = await transactionService.getAll(userId, query)

    return Response.json(result)
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/transactions
 * Create a new transaction
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new UnauthorizedError()
    }

    const body = await req.json()
    const data = createTransactionSchema.parse(body)

    const transaction = await transactionService.create(userId, data)

    return Response.json({ transaction }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
