import { prisma } from '@/lib/db'
import { TagSource } from '@prisma/client'

export interface TagRuleInput {
  pattern: string
  patternType: 'MERCHANT_CONTAINS' | 'MERCHANT_EQUALS' | 'DESCRIPTION_CONTAINS' | 'REGEX'
  tagIds: string[]
  categoryId?: string | null
  confidenceBoost?: number
  priority?: number
}

export interface TagRuleWithDetails {
  id: string
  pattern: string
  patternType: string
  tagIds: string[]
  tagNames: string[]
  categoryId: string | null
  categoryName: string | null
  confidenceBoost: number
  priority: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Create a tag rule
 */
export async function createTagRule(
  userId: string,
  rule: TagRuleInput
): Promise<TagRuleWithDetails> {
  const createdRule = await prisma.tagRule.create({
    data: {
      userId,
      pattern: rule.pattern,
      patternType: rule.patternType,
      tagIds: rule.tagIds,
      categoryId: rule.categoryId,
      confidenceBoost: rule.confidenceBoost || 0,
      priority: rule.priority || 0,
      active: true,
    },
    include: {
      category: true,
    },
  })

  // Get tag names
  const tags = await prisma.tag.findMany({
    where: {
      id: { in: rule.tagIds },
    },
  })

  return {
    id: createdRule.id,
    pattern: createdRule.pattern,
    patternType: createdRule.patternType,
    tagIds: createdRule.tagIds,
    tagNames: tags.map((t) => t.name),
    categoryId: createdRule.categoryId,
    categoryName: createdRule.category?.name || null,
    confidenceBoost: createdRule.confidenceBoost,
    priority: createdRule.priority,
    active: createdRule.active,
    createdAt: createdRule.createdAt,
    updatedAt: createdRule.updatedAt,
  }
}

/**
 * Get all tag rules for a user
 */
export async function getUserTagRules(userId: string): Promise<TagRuleWithDetails[]> {
  const rules = await prisma.tagRule.findMany({
    where: {
      userId,
    },
    include: {
      category: true,
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  // Get all tags for all rules
  const allTagIds = rules.flatMap((r) => r.tagIds)
  const tags = await prisma.tag.findMany({
    where: {
      id: { in: allTagIds },
    },
  })

  const tagMap = new Map(tags.map((t) => [t.id, t.name]))

  return rules.map((rule) => ({
    id: rule.id,
    pattern: rule.pattern,
    patternType: rule.patternType,
    tagIds: rule.tagIds,
    tagNames: rule.tagIds.map((id) => tagMap.get(id) || 'Unknown'),
    categoryId: rule.categoryId,
    categoryName: rule.category?.name || null,
    confidenceBoost: rule.confidenceBoost,
    priority: rule.priority,
    active: rule.active,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  }))
}

/**
 * Update a tag rule
 */
export async function updateTagRule(
  userId: string,
  ruleId: string,
  updates: Partial<TagRuleInput> & { active?: boolean }
): Promise<TagRuleWithDetails> {
  const updatedRule = await prisma.tagRule.update({
    where: {
      id: ruleId,
      userId, // Ensure user owns this rule
    },
    data: updates,
    include: {
      category: true,
    },
  })

  const tags = await prisma.tag.findMany({
    where: {
      id: { in: updatedRule.tagIds },
    },
  })

  return {
    id: updatedRule.id,
    pattern: updatedRule.pattern,
    patternType: updatedRule.patternType,
    tagIds: updatedRule.tagIds,
    tagNames: tags.map((t) => t.name),
    categoryId: updatedRule.categoryId,
    categoryName: updatedRule.category?.name || null,
    confidenceBoost: updatedRule.confidenceBoost,
    priority: updatedRule.priority,
    active: updatedRule.active,
    createdAt: updatedRule.createdAt,
    updatedAt: updatedRule.updatedAt,
  }
}

/**
 * Delete a tag rule
 */
export async function deleteTagRule(userId: string, ruleId: string): Promise<void> {
  await prisma.tagRule.delete({
    where: {
      id: ruleId,
      userId,
    },
  })
}

/**
 * Apply tag rules to a transaction
 */
export async function applyTagRulesToTransaction(
  userId: string,
  transactionId: string
): Promise<{ tagsAdded: number; categoryUpdated: boolean }> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  })

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  // Get all active rules for user
  const rules = await prisma.tagRule.findMany({
    where: {
      userId,
      active: true,
    },
    orderBy: [
      { priority: 'desc' },
    ],
  })

  let tagsAdded = 0
  let categoryUpdated = false

  for (const rule of rules) {
    const matches = matchesRule(transaction, rule)

    if (matches) {
      // Add tags
      for (const tagId of rule.tagIds) {
        // Check if tag already exists
        const existing = await prisma.transactionTag.findFirst({
          where: {
            transactionId,
            tagId,
          },
        })

        if (!existing) {
          await prisma.transactionTag.create({
            data: {
              transactionId,
              tagId,
              source: TagSource.RULE,
              confidence: 1.0 + rule.confidenceBoost,
            },
          })
          tagsAdded++
        }
      }

      // Update category if rule has one and transaction doesn't
      if (rule.categoryId && !transaction.categoryId) {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: { categoryId: rule.categoryId },
        })
        categoryUpdated = true
      }
    }
  }

  return { tagsAdded, categoryUpdated }
}

/**
 * Apply tag rules to multiple transactions
 */
export async function applyTagRulesToTransactions(
  userId: string,
  transactionIds: string[]
): Promise<{ totalTagsAdded: number; transactionsUpdated: number }> {
  let totalTagsAdded = 0
  let transactionsUpdated = 0

  for (const txnId of transactionIds) {
    const result = await applyTagRulesToTransaction(userId, txnId)
    if (result.tagsAdded > 0 || result.categoryUpdated) {
      totalTagsAdded += result.tagsAdded
      transactionsUpdated++
    }
  }

  return { totalTagsAdded, transactionsUpdated }
}

/**
 * Check if transaction matches a rule
 */
function matchesRule(
  transaction: { description: string; merchant: string | null },
  rule: { pattern: string; patternType: string }
): boolean {
  const pattern = rule.pattern.toLowerCase()
  const merchant = (transaction.merchant || '').toLowerCase()
  const description = transaction.description.toLowerCase()

  switch (rule.patternType) {
    case 'MERCHANT_CONTAINS':
      return merchant.includes(pattern)

    case 'MERCHANT_EQUALS':
      return merchant === pattern

    case 'DESCRIPTION_CONTAINS':
      return description.includes(pattern)

    case 'REGEX':
      try {
        const regex = new RegExp(pattern, 'i')
        return regex.test(merchant) || regex.test(description)
      } catch (err) {
        console.error('Invalid regex pattern:', pattern, err)
        return false
      }

    default:
      return false
  }
}

/**
 * Suggest tag rules based on transaction patterns
 */
export async function suggestTagRules(userId: string): Promise<Array<{
  pattern: string
  patternType: string
  tagIds: string[]
  tagNames: string[]
  categoryId: string | null
  categoryName: string | null
  matchCount: number
}>> {
  // Get transactions with tags and categories
  const transactions = await prisma.transaction.findMany({
    where: {
      account: {
        userId,
      },
    },
    include: {
      txTags: {
        include: {
          tag: true,
        },
      },
      category: true,
    },
    take: 500, // Analyze last 500 transactions
    orderBy: {
      postedAt: 'desc',
    },
  })

  // Group by merchant
  const merchantGroups: Record<string, Array<{
    tagIds: string[]
    categoryId: string | null
  }>> = {}

  for (const txn of transactions) {
    const merchant = (txn.merchant || '').toLowerCase().trim()
    if (!merchant) continue

    if (!merchantGroups[merchant]) {
      merchantGroups[merchant] = []
    }

    merchantGroups[merchant].push({
      tagIds: txn.txTags.map((tt) => tt.tagId),
      categoryId: txn.categoryId,
    })
  }

  const suggestions: Array<{
    pattern: string
    patternType: string
    tagIds: string[]
    tagNames: string[]
    categoryId: string | null
    categoryName: string | null
    matchCount: number
  }> = []

  // Suggest rules for merchants that appear 3+ times with consistent tags/categories
  for (const [merchant, txns] of Object.entries(merchantGroups)) {
    if (txns.length < 3) continue

    // Find most common tags
    const tagCounts: Record<string, number> = {}
    for (const txn of txns) {
      for (const tagId of txn.tagIds) {
        tagCounts[tagId] = (tagCounts[tagId] || 0) + 1
      }
    }

    const commonTags = Object.entries(tagCounts)
      .filter(([_, count]) => count >= txns.length * 0.7) // 70% consistency
      .map(([tagId]) => tagId)

    // Find most common category
    const categoryCounts: Record<string, number> = {}
    for (const txn of txns) {
      if (txn.categoryId) {
        categoryCounts[txn.categoryId] = (categoryCounts[txn.categoryId] || 0) + 1
      }
    }

    const commonCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]

    if (commonTags.length > 0 || commonCategory) {
      // Get tag and category names
      const tags = await prisma.tag.findMany({
        where: {
          id: { in: commonTags },
        },
      })

      const category = commonCategory
        ? await prisma.category.findUnique({
            where: { id: commonCategory[0] },
          })
        : null

      suggestions.push({
        pattern: merchant,
        patternType: 'MERCHANT_CONTAINS',
        tagIds: commonTags,
        tagNames: tags.map((t) => t.name),
        categoryId: category?.id || null,
        categoryName: category?.name || null,
        matchCount: txns.length,
      })
    }
  }

  return suggestions.sort((a, b) => b.matchCount - a.matchCount).slice(0, 10)
}
