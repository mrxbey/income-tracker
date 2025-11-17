import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { scanAndCategorizeReceipt } from '@/lib/ai/gemini-receipt-scanner'
import { handleError, UnauthorizedError } from '@/lib/errors'

const scanReceiptSchema = z.object({
  imageBase64: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) throw new UnauthorizedError()

    const body = await req.json()
    const { imageBase64 } = scanReceiptSchema.parse(body)

    const result = await scanAndCategorizeReceipt(imageBase64)

    return Response.json(result)
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
