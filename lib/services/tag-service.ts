import { db } from '@/lib/prisma'
import type { CreateTagInput, UpdateTagInput } from '@/lib/validations'
import { NotFoundError } from '@/lib/errors'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const tagService = {
  /**
   * Get all tags for a user
   */
  async getAll(userId: string) {
    return db.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            txTags: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })
  },

  /**
   * Get a single tag
   */
  async getById(userId: string, tagId: string) {
    const tag = await db.tag.findFirst({
      where: {
        id: tagId,
        userId,
      },
      include: {
        _count: {
          select: {
            txTags: true,
          },
        },
      },
    })

    if (!tag) {
      throw new NotFoundError('Tag')
    }

    return tag
  },

  /**
   * Create a new tag
   */
  async create(userId: string, data: CreateTagInput) {
    const slug = slugify(data.name)

    return db.tag.create({
      data: {
        ...data,
        slug,
        userId,
      },
    })
  },

  /**
   * Update a tag
   */
  async update(userId: string, tagId: string, data: UpdateTagInput) {
    // Verify ownership
    await this.getById(userId, tagId)

    const updateData = {
      ...data,
      ...(data.name && { slug: slugify(data.name) }),
    }

    return db.tag.update({
      where: {
        id: tagId,
      },
      data: updateData,
    })
  },

  /**
   * Delete a tag
   */
  async delete(userId: string, tagId: string) {
    // Verify ownership
    await this.getById(userId, tagId)

    return db.tag.delete({
      where: {
        id: tagId,
      },
    })
  },

  /**
   * Get tag analytics (spending by tag)
   */
  async getAnalytics(userId: string, tagId: string, fromDate?: Date, toDate?: Date) {
    const tag = await this.getById(userId, tagId)

    const transactions = await db.transaction.findMany({
      where: {
        account: { userId },
        txTags: {
          some: { tagId },
        },
        ...(fromDate &&
          toDate && {
            postedAt: {
              gte: fromDate,
              lte: toDate,
            },
          }),
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
      },
    })

    const totalSpent = transactions.reduce((sum, tx) => {
      const amount = parseFloat(tx.amount.toString())
      return sum + (amount < 0 ? Math.abs(amount) : 0)
    }, 0)

    const totalIncome = transactions.reduce((sum, tx) => {
      const amount = parseFloat(tx.amount.toString())
      return sum + (amount > 0 ? amount : 0)
    }, 0)

    const byAccount = transactions.reduce(
      (acc, tx) => {
        const accountId = tx.accountId
        const amount = Math.abs(parseFloat(tx.amount.toString()))

        if (!acc[accountId]) {
          acc[accountId] = {
            accountId,
            accountName: tx.account.name,
            total: 0,
            count: 0,
          }
        }

        acc[accountId].total += amount
        acc[accountId].count += 1

        return acc
      },
      {} as Record<
        string,
        {
          accountId: string
          accountName: string
          total: number
          count: number
        }
      >
    )

    return {
      tag,
      totalSpent,
      totalIncome,
      transactionCount: transactions.length,
      byAccount: Object.values(byAccount),
    }
  },

  /**
   * Merge two tags
   */
  async merge(userId: string, fromTagId: string, toTagId: string) {
    // Verify ownership of both tags
    await this.getById(userId, fromTagId)
    await this.getById(userId, toTagId)

    // Update all transaction tags
    await db.transactionTag.updateMany({
      where: {
        tagId: fromTagId,
      },
      data: {
        tagId: toTagId,
      },
    })

    // Delete the old tag
    await db.tag.delete({
      where: {
        id: fromTagId,
      },
    })

    return this.getById(userId, toTagId)
  },
}
