import { db as prisma } from '@/lib/prisma'

export interface TransactionSplitInput {
  categoryId: string
  amount: number
  percentage?: number | null
  description?: string | null
}

export interface TransactionWithSplits {
  id: string
  description: string
  amount: number
  currency: string
  splits: Array<{
    id: string
    categoryId: string
    categoryName: string
    amount: number
    percentage: number | null
    description: string | null
  }>
  isSplit: boolean
  totalSplitAmount: number
}

/**
 * Create splits for a transaction
 */
export async function createTransactionSplits(
  transactionId: string,
  splits: TransactionSplitInput[]
): Promise<void> {
  // Validate transaction exists
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  })

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  const totalAmount = Math.abs(Number(transaction.amount))

  // Validate split amounts
  const splitTotal = splits.reduce((sum, split) => sum + split.amount, 0)

  if (Math.abs(splitTotal - totalAmount) > 0.01) {
    throw new Error(`Split amounts (${splitTotal}) must equal transaction amount (${totalAmount})`)
  }

  // Delete existing splits
  await prisma.transactionSplit.deleteMany({
    where: { transactionId },
  })

  // Create new splits
  await prisma.transactionSplit.createMany({
    data: splits.map((split) => ({
      transactionId,
      categoryId: split.categoryId,
      amount: split.amount,
      percentage: split.percentage,
      description: split.description,
    })),
  })

  // Update transaction category to null (since it's now split)
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { categoryId: null },
  })
}

/**
 * Get transaction with splits
 */
export async function getTransactionWithSplits(
  transactionId: string
): Promise<TransactionWithSplits | null> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      splits: {
        include: {
          category: true,
        },
      },
    },
  })

  if (!transaction) {
    return null
  }

  const splits = transaction.splits.map((split) => ({
    id: split.id,
    categoryId: split.categoryId,
    categoryName: split.category.name,
    amount: Number(split.amount),
    percentage: split.percentage ? Number(split.percentage) : null,
    description: split.description,
  }))

  const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0)

  return {
    id: transaction.id,
    description: transaction.description,
    amount: Number(transaction.amount),
    currency: transaction.currency,
    splits,
    isSplit: splits.length > 0,
    totalSplitAmount,
  }
}

/**
 * Update transaction splits
 */
export async function updateTransactionSplits(
  transactionId: string,
  splits: TransactionSplitInput[]
): Promise<void> {
  await createTransactionSplits(transactionId, splits)
}

/**
 * Delete all splits for a transaction (convert back to regular transaction)
 */
export async function deleteTransactionSplits(
  transactionId: string,
  newCategoryId?: string
): Promise<void> {
  await prisma.transactionSplit.deleteMany({
    where: { transactionId },
  })

  // Update transaction category if provided
  if (newCategoryId) {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { categoryId: newCategoryId },
    })
  }
}

/**
 * Get common split templates
 */
export function getSplitTemplates() {
  return [
    {
      name: 'Groceries + Alcohol (80/20)',
      description: 'Split grocery store purchase',
      splits: [
        { percentage: 80, category: 'Groceries' },
        { percentage: 20, category: 'Alcohol' },
      ],
    },
    {
      name: 'Business Meal (70/30)',
      description: 'Business dinner with personal portion',
      splits: [
        { percentage: 70, category: 'Business Expense' },
        { percentage: 30, category: 'Dining' },
      ],
    },
    {
      name: 'Household Supplies Split',
      description: 'Mix of household items',
      splits: [
        { percentage: 50, category: 'Household' },
        { percentage: 30, category: 'Cleaning' },
        { percentage: 20, category: 'Pet Supplies' },
      ],
    },
    {
      name: 'Amazon Order (Multiple Categories)',
      description: 'Online shopping with varied items',
      splits: [
        { percentage: 40, category: 'Electronics' },
        { percentage: 30, category: 'Books' },
        { percentage: 30, category: 'Home & Garden' },
      ],
    },
  ]
}

/**
 * Apply split template to transaction
 */
export async function applySplitTemplate(
  userId: string,
  transactionId: string,
  templateName: string
): Promise<void> {
  const templates = getSplitTemplates()
  const template = templates.find((t) => t.name === templateName)

  if (!template) {
    throw new Error('Template not found')
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  })

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  const totalAmount = Math.abs(Number(transaction.amount))

  // Get categories by name for the user
  const categoryNames = template.splits.map((s) => s.category)
  const categories = await prisma.category.findMany({
    where: {
      userId,
      name: {
        in: categoryNames,
      },
    },
  })

  // Build splits
  const splits: TransactionSplitInput[] = template.splits.map((templateSplit) => {
    const category = categories.find((c) => c.name === templateSplit.category)

    if (!category) {
      throw new Error(`Category not found: ${templateSplit.category}`)
    }

    const amount = (totalAmount * templateSplit.percentage) / 100

    return {
      categoryId: category.id,
      amount,
      percentage: templateSplit.percentage,
      description: null,
    }
  })

  await createTransactionSplits(transactionId, splits)
}
