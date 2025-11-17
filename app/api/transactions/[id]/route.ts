import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { transactionService } from '@/lib/services/transaction-service'
import { updateTransactionSchema } from '@/lib/validations'
import { handleError, UnauthorizedError } from '@/lib/errors'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) throw new UnauthorizedError()

    const transaction = await transactionService.getById(userId, params.id)
    return Response.json({ transaction })
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) throw new UnauthorizedError()

    const body = await req.json()
    const data = updateTransactionSchema.parse(body)

    const transaction = await transactionService.update(userId, params.id, data)
    return Response.json({ transaction })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) throw new UnauthorizedError()

    await transactionService.delete(userId, params.id)
    return Response.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    return handleError(error)
  }
}
