import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { accountService } from '@/lib/services/account-service'
import { updateAccountSchema } from '@/lib/validations'
import { handleError, UnauthorizedError } from '@/lib/errors'

/**
 * GET /api/accounts/:id
 * Get a single account
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new UnauthorizedError()
    }

    const account = await accountService.getById(userId, params.id)

    return Response.json({ account })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PATCH /api/accounts/:id
 * Update an account
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new UnauthorizedError()
    }

    const body = await req.json()
    const data = updateAccountSchema.parse(body)

    const account = await accountService.update(userId, params.id, data)

    return Response.json({ account })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * DELETE /api/accounts/:id
 * Delete an account
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new UnauthorizedError()
    }

    await accountService.delete(userId, params.id)

    return Response.json({ message: 'Account deleted successfully' })
  } catch (error) {
    return handleError(error)
  }
}
