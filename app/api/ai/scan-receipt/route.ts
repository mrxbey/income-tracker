import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { scanAndCategorizeReceipt } from '@/lib/ai/gemini-receipt-scanner'
import { handleError, UnauthorizedError } from '@/lib/errors'
import { applyRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

const scanReceiptSchema = z.object({
  imageBase64: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting for expensive AI operations
    const rateLimitResult = applyRateLimit(req, 'EXPENSIVE')
    if (!rateLimitResult.success) return rateLimitResult.response

    const { userId } = await auth()
    if (!userId) throw new UnauthorizedError()

    const body = await req.json()
    const { imageBase64 } = scanReceiptSchema.parse(body)

    const result = await scanAndCategorizeReceipt(imageBase64)

    return NextResponse.json(result, {
      headers: getRateLimitHeaders('EXPENSIVE', rateLimitResult.remaining, rateLimitResult.reset),
    })
  } catch (error) {
    return handleError(error)
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
