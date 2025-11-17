import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

export interface ExtractedReceiptData {
  merchant: string
  date: string
  total: number
  currency: string
  items: Array<{
    name: string
    price: number
    quantity?: number
    category?: string
  }>
  taxAmount?: number
  tipAmount?: number
  paymentMethod?: string
  confidence: number
}

export async function scanReceipt(imageBase64: string): Promise<ExtractedReceiptData> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `You are a receipt OCR system. Extract all relevant information from this receipt image.

Extract the following information:
1. Merchant/Store name
2. Date of purchase (YYYY-MM-DD format)
3. Total amount
4. Currency (e.g., USD, TRY, GBP)
5. Line items with names and prices
6. Tax amount (if shown)
7. Tip amount (if shown)
8. Payment method (if shown)

For each line item, also suggest a category (e.g., "Groceries", "Food & Drink", "Household", etc.)

Respond in JSON format:
{
  "merchant": "Store Name",
  "date": "2025-01-17",
  "total": 45.99,
  "currency": "USD",
  "items": [
    {
      "name": "Item name",
      "price": 12.99,
      "quantity": 2,
      "category": "Groceries"
    }
  ],
  "taxAmount": 3.50,
  "tipAmount": 5.00,
  "paymentMethod": "Credit Card",
  "confidence": 0.95
}

If you cannot read certain fields clearly, use null for that field and lower the confidence score accordingly.`

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/jpeg',
      },
    }

    const result = await model.generateContent([prompt, imagePart])
    const response = result.response
    const text = response.text()

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse receipt data')
    }

    const extracted: ExtractedReceiptData = JSON.parse(jsonMatch[0])

    // Validate and normalize data
    return {
      ...extracted,
      total: Number(extracted.total) || 0,
      currency: extracted.currency || 'USD',
      items: (extracted.items || []).map((item) => ({
        ...item,
        price: Number(item.price) || 0,
        quantity: item.quantity || 1,
      })),
      confidence: Number(extracted.confidence) || 0.5,
    }
  } catch (error) {
    console.error('Receipt scanning error:', error)
    throw new Error('Failed to scan receipt. Please try again or enter manually.')
  }
}

// Enhanced version that also categorizes the transaction
export async function scanAndCategorizeReceipt(imageBase64: string): Promise<ExtractedReceiptData & {
  suggestedCategory: string
  suggestedTags: string[]
}> {
  const receiptData = await scanReceipt(imageBase64)

  // Determine overall category based on items
  const categories = receiptData.items.map((item) => item.category).filter(Boolean)
  const categoryCount: Record<string, number> = {}

  categories.forEach((cat) => {
    if (cat) {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1
    }
  })

  const suggestedCategory =
    Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Shopping'

  // Generate tags from merchant and category
  const tags: string[] = []
  if (receiptData.merchant) {
    const merchantTag = receiptData.merchant.toLowerCase().split(' ')[0]
    if (merchantTag) tags.push(merchantTag)
  }
  if (suggestedCategory) {
    tags.push(suggestedCategory.toLowerCase().replace(/\s+/g, '-'))
  }

  return {
    ...receiptData,
    suggestedCategory,
    suggestedTags: tags,
  }
}

// Validate receipt image before processing
export function validateReceiptImage(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Please upload a JPG, PNG, or WebP image' }
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be smaller than 10MB' }
  }

  return { valid: true }
}

// Convert File to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Failed to convert file to base64'))
        return
      }
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
