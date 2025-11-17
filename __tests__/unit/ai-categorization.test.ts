import { describe, it, expect, vi } from 'vitest'
import { categorizeTransaction, categorizeBatch } from '@/lib/ai/gemini-categorization'

// Mock the Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            category: 'Groceries',
            tags: ['groceries', 'food'],
            confidence: 0.95,
            reasoning: 'Transaction at a grocery store'
          })
        }
      })
    })
  }))
}))

describe('AI Categorization', () => {
  const availableCategories = ['Groceries', 'Dining', 'Transportation', 'Shopping', 'Utilities']

  describe('categorizeTransaction', () => {
    it('should categorize a grocery transaction with high confidence', async () => {
      const transaction = {
        description: 'Whole Foods Market',
        merchant: 'Whole Foods',
        amount: 78.43,
        currency: 'USD'
      }

      const result = await categorizeTransaction(transaction, availableCategories)

      expect(result.suggestedCategory).toBe('Groceries')
      expect(result.suggestedTags).toContain('groceries')
      expect(result.confidence).toBeGreaterThanOrEqual(0.7)
    })

    it('should categorize a restaurant transaction', async () => {
      const transaction = {
        description: 'Starbucks Coffee',
        merchant: 'Starbucks',
        amount: 5.99,
        currency: 'USD'
      }

      const result = await categorizeTransaction(transaction, availableCategories)

      expect(result.suggestedCategory).toBeTruthy()
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should handle unknown merchants with lower confidence', async () => {
      const transaction = {
        description: 'Unknown Merchant XYZ',
        merchant: null,
        amount: 50.00,
        currency: 'TRY'
      }

      const result = await categorizeTransaction(transaction, availableCategories)

      expect(result.suggestedCategory).toBeTruthy()
      expect(result.confidence).toBeLessThan(1.0)
    })
  })

  describe('Fallback Categorization', () => {
    it('should use fallback rules for common patterns', async () => {
      const groceryTransaction = {
        description: 'MIGROS',
        merchant: 'Migros',
        amount: 150.00,
        currency: 'TRY'
      }

      const result = await categorizeTransaction(groceryTransaction, availableCategories)

      expect(result.suggestedCategory).toBe('Groceries')
    })

    it('should categorize Uber as Transportation', async () => {
      const transaction = {
        description: 'Uber Trip',
        merchant: 'Uber',
        amount: 25.50,
        currency: 'USD'
      }

      const result = await categorizeTransaction(transaction, availableCategories)

      expect(result.suggestedCategory).toBe('Transportation')
      expect(result.suggestedTags).toContain('transport')
    })

    it('should categorize Amazon as Shopping', async () => {
      const transaction = {
        description: 'Amazon.com',
        merchant: 'Amazon',
        amount: 89.99,
        currency: 'USD'
      }

      const result = await categorizeTransaction(transaction, availableCategories)

      expect(result.suggestedCategory).toBe('Shopping')
    })
  })

  describe('categorizeBatch', () => {
    it('should categorize multiple transactions', async () => {
      const transactions = [
        { description: 'Starbucks', merchant: 'Starbucks', amount: 5.99, currency: 'USD' },
        { description: 'Whole Foods', merchant: 'Whole Foods', amount: 78.43, currency: 'USD' },
        { description: 'Uber', merchant: 'Uber', amount: 15.00, currency: 'USD' }
      ]

      const results = await categorizeBatch(transactions, availableCategories)

      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.suggestedCategory).toBeTruthy()
        expect(result.confidence).toBeGreaterThan(0)
      })
    })

    it('should handle empty transaction list', async () => {
      const results = await categorizeBatch([], availableCategories)

      expect(results).toHaveLength(0)
    })
  })

  describe('Confidence Scoring', () => {
    it('should return high confidence for clear patterns', async () => {
      const transaction = {
        description: 'ELECTRIC BILL PAYMENT',
        merchant: 'Electric Company',
        amount: 120.00,
        currency: 'USD'
      }

      const result = await categorizeTransaction(transaction, availableCategories)

      expect(result.confidence).toBeGreaterThanOrEqual(0.7)
    })

    it('should return lower confidence for ambiguous transactions', async () => {
      const transaction = {
        description: 'Payment',
        merchant: null,
        amount: 100.00,
        currency: 'USD'
      }

      const result = await categorizeTransaction(transaction, availableCategories)

      expect(result.confidence).toBeLessThanOrEqual(0.5)
    })
  })

  describe('Tag Generation', () => {
    it('should generate relevant tags', async () => {
      const transaction = {
        description: 'Grocery shopping at Carrefour',
        merchant: 'Carrefour',
        amount: 95.50,
        currency: 'TRY'
      }

      const result = await categorizeTransaction(transaction, availableCategories)

      expect(result.suggestedTags.length).toBeGreaterThan(0)
    })

    it('should limit tags to reasonable number', async () => {
      const transaction = {
        description: 'Complex transaction with multiple items',
        merchant: 'Various',
        amount: 200.00,
        currency: 'USD'
      }

      const result = await categorizeTransaction(transaction, availableCategories)

      expect(result.suggestedTags.length).toBeLessThanOrEqual(5)
    })
  })
})
