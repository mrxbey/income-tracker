import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { accountService } from '@/lib/services/account-service'
import { createAccountSchema, accountQuerySchema } from '@/lib/validations'
import { handleError, UnauthorizedError } from '@/lib/errors'

/**
 * GET /api/accounts
 * List all accounts for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new UnauthorizedError()
    }

    const searchParams = req.nextUrl.searchParams
    const query = accountQuerySchema.parse({
      type: searchParams.get('type') || undefined,
      regionGroup: searchParams.get('regionGroup') || undefined,
      countryCode: searchParams.get('countryCode') || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
    })

    const accounts = await accountService.getAll(userId, query)

    return Response.json({ accounts })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * POST /api/accounts
 * Create a new account
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new UnauthorizedError()
    }

    const body = await req.json()
    const data = createAccountSchema.parse(body)

    const account = await accountService.create(userId, data)

    return Response.json({ account }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
