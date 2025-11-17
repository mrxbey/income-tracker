import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { tagService } from '@/lib/services/tag-service'
import { createTagSchema } from '@/lib/validations'
import { handleError, UnauthorizedError } from '@/lib/errors'

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) throw new UnauthorizedError()

    const tags = await tagService.getAll(userId)
    return Response.json({ tags })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) throw new UnauthorizedError()

    const body = await req.json()
    const data = createTagSchema.parse(body)

    const tag = await tagService.create(userId, data)
    return Response.json({ tag }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
