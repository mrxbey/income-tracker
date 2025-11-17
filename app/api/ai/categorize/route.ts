import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { categorizeTransaction, categorizeBatch } from '@/lib/ai/gemini-categorization'
import { db } from '@/lib/prisma'
import { handleError, UnauthorizedError } from '@/lib/errors'

const categorizeSchema = z.object({
  description: z.string(),
  merchant: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
})

const batchCategorizeSchema = z.object({
  transactions: z.array(categorizeSchema),
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) throw new UnauthorizedError()

    const body = await req.json()

    // Check if batch or single
    if (body.transactions) {
      // Batch categorization
      const data = batchCategorizeSchema.parse(body)

      // Get user's categories
      const categories = await db.category.findMany({
        where: { userId },
        select: { name: true },
      })

      const categoryNames = categories.map((c) => c.name)

      const results = await categorizeBatch(data.transactions, categoryNames)

      return Response.json({ results })
    } else {
      // Single categorization
      const transaction = categorizeSchema.parse(body)

      // Get user's categories
      const categories = await db.category.findMany({
        where: { userId },
        select: { name: true },
      })

      const categoryNames = categories.map((c) => c.name)

      const result = await categorizeTransaction(transaction, categoryNames)

      return Response.json(result)
    }
  } catch (error) {
    return handleError(error)
  }
}
