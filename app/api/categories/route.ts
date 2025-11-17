import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { categoryService } from '@/lib/services/category-service'
import { createCategorySchema } from '@/lib/validations'
import { handleError, UnauthorizedError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) throw new UnauthorizedError()

    const searchParams = req.nextUrl.searchParams
    const tree = searchParams.get('tree') === 'true'

    const categories = tree
      ? await categoryService.getTree(userId)
      : await categoryService.getAll(userId)

    return Response.json({ categories })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) throw new UnauthorizedError()

    const body = await req.json()
    const data = createCategorySchema.parse(body)

    const category = await categoryService.create(userId, data)
    return Response.json({ category }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
