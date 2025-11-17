import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

export interface TransactionInput {
  description: string
  merchant?: string | null
  amount: number
  currency: string
}

export interface CategorizationResult {
  suggestedCategory: string
  suggestedTags: string[]
  confidence: number
  reasoning?: string
}

export async function categorizeTransaction(
  transaction: TransactionInput,
  availableCategories: string[]
): Promise<CategorizationResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `You are a personal finance AI assistant. Analyze this transaction and suggest the most appropriate category and tags.

Transaction Details:
- Description: ${transaction.description}
- Merchant: ${transaction.merchant || 'Unknown'}
- Amount: ${transaction.amount} ${transaction.currency}

Available Categories:
${availableCategories.join(', ')}

Instructions:
1. Choose the MOST APPROPRIATE category from the list above
2. Suggest 1-3 relevant tags (e.g., "coffee", "groceries", "utility")
3. Provide a confidence score (0-1)
4. Brief reasoning for your choice

Respond in JSON format:
{
  "category": "category name",
  "tags": ["tag1", "tag2"],
  "confidence": 0.95,
  "reasoning": "brief explanation"
}`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      suggestedCategory: parsed.category,
      suggestedTags: parsed.tags || [],
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning,
    }
  } catch (error) {
    console.error('AI categorization error:', error)
    // Fallback to basic rules
    return fallbackCategorization(transaction)
  }
}

// Fallback categorization using simple rules
function fallbackCategorization(transaction: TransactionInput): CategorizationResult {
  const desc = transaction.description.toLowerCase()
  const merchant = (transaction.merchant || '').toLowerCase()

  // Food & Dining
  if (
    desc.includes('restaurant') ||
    desc.includes('cafe') ||
    desc.includes('coffee') ||
    merchant.includes('starbucks') ||
    merchant.includes('mcdonalds')
  ) {
    return {
      suggestedCategory: 'Food & Drink',
      suggestedTags: ['dining', 'food'],
      confidence: 0.7,
    }
  }

  // Groceries
  if (
    desc.includes('grocery') ||
    desc.includes('supermarket') ||
    merchant.includes('walmart') ||
    merchant.includes('whole foods') ||
    merchant.includes('migros') ||
    merchant.includes('carrefour')
  ) {
    return {
      suggestedCategory: 'Groceries',
      suggestedTags: ['groceries', 'food'],
      confidence: 0.7,
    }
  }

  // Transportation
  if (
    desc.includes('uber') ||
    desc.includes('lyft') ||
    desc.includes('taxi') ||
    desc.includes('gas') ||
    desc.includes('fuel') ||
    desc.includes('parking')
  ) {
    return {
      suggestedCategory: 'Transportation',
      suggestedTags: ['transport', 'travel'],
      confidence: 0.7,
    }
  }

  // Shopping
  if (
    desc.includes('amazon') ||
    desc.includes('shop') ||
    merchant.includes('amazon') ||
    merchant.includes('ebay')
  ) {
    return {
      suggestedCategory: 'Shopping',
      suggestedTags: ['shopping', 'retail'],
      confidence: 0.6,
    }
  }

  // Utilities
  if (
    desc.includes('electric') ||
    desc.includes('water') ||
    desc.includes('internet') ||
    desc.includes('phone')
  ) {
    return {
      suggestedCategory: 'Utilities',
      suggestedTags: ['utility', 'bills'],
      confidence: 0.8,
    }
  }

  // Default
  return {
    suggestedCategory: 'Other',
    suggestedTags: [],
    confidence: 0.3,
  }
}

// Batch categorization for multiple transactions
export async function categorizeBatch(
  transactions: TransactionInput[],
  availableCategories: string[]
): Promise<CategorizationResult[]> {
  const results: CategorizationResult[] = []

  // Process in chunks of 5 to avoid rate limits
  const chunkSize = 5
  for (let i = 0; i < transactions.length; i += chunkSize) {
    const chunk = transactions.slice(i, i + chunkSize)
    const chunkResults = await Promise.all(
      chunk.map((txn) => categorizeTransaction(txn, availableCategories))
    )
    results.push(...chunkResults)

    // Small delay between chunks
    if (i + chunkSize < transactions.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results
}

// Learn from user corrections
export interface UserCorrection {
  transaction: TransactionInput
  userSelectedCategory: string
  userSelectedTags: string[]
  aiSuggestedCategory: string
}

export function learnFromCorrection(correction: UserCorrection): string {
  // In a real implementation, this would update a training database
  // For now, we return a message for logging
  return `Learning: "${correction.transaction.description}" should be "${correction.userSelectedCategory}", not "${correction.aiSuggestedCategory}"`
}
