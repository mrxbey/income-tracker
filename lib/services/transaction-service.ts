import { db } from '@/lib/prisma'
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionQueryInput,
} from '@/lib/validations'
import { NotFoundError } from '@/lib/errors'
import { Prisma } from '@prisma/client'

export const transactionService = {
  /**
   * Get all transactions for a user with filters
   */
  async getAll(userId: string, query: TransactionQueryInput) {
    const where: Prisma.TransactionWhereInput = {
      account: {
        userId,
      },
      ...(query.accountId && { accountId: query.accountId }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.type && { type: query.type }),
      ...(query.fromDate &&
        query.toDate && {
          postedAt: {
            gte: new Date(query.fromDate),
            lte: new Date(query.toDate),
          },
        }),
      ...(query.minAmount !== undefined &&
        query.maxAmount !== undefined && {
          amount: {
            gte: query.minAmount,
            lte: query.maxAmount,
          },
        }),
      ...(query.search && {
        OR: [
          { description: { contains: query.search, mode: 'insensitive' } },
          { merchant: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.tagId && {
        txTags: {
          some: {
            tagId: query.tagId,
          },
        },
      }),
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          account: {
            select: {
              id: true,
              name: true,
              currency: true,
              type: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          txTags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: {
          postedAt: 'desc',
        },
        take: query.limit,
        skip: query.offset,
      }),
      db.transaction.count({ where }),
    ])

    return {
      transactions,
      total,
      limit: query.limit,
      offset: query.offset,
    }
  },

  /**
   * Get a single transaction
   */
  async getById(userId: string, transactionId: string) {
    const transaction = await db.transaction.findFirst({
      where: {
        id: transactionId,
        account: {
          userId,
        },
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
            type: true,
          },
        },
        category: true,
        txTags: {
          include: {
            tag: true,
          },
        },
        installmentPlan: true,
      },
    })

    if (!transaction) {
      throw new NotFoundError('Transaction')
    }

    return transaction
  },

  /**
   * Create a new transaction
   */
  async create(userId: string, data: CreateTransactionInput) {
    // Verify account ownership
    const account = await db.account.findFirst({
      where: {
        id: data.accountId,
        userId,
      },
    })

    if (!account) {
      throw new NotFoundError('Account')
    }

    const { tagIds, ...transactionData } = data

    const transaction = await db.transaction.create({
      data: {
        ...transactionData,
        amount: data.amount.toString(),
        postedAt: new Date(data.postedAt),
        ...(tagIds &&
          tagIds.length > 0 && {
            txTags: {
              create: tagIds.map((tagId) => ({
                tagId,
                source: 'USER',
                confidence: 1.0,
              })),
            },
          }),
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
            type: true,
          },
        },
        category: true,
        txTags: {
          include: {
            tag: true,
          },
        },
      },
    })

    // Update account balance
    const newBalance =
      parseFloat(account.balance.toString()) + parseFloat(transaction.amount.toString())

    await db.account.update({
      where: { id: data.accountId },
      data: { balance: newBalance.toString() },
    })

    return transaction
  },

  /**
   * Update a transaction
   */
  async update(userId: string, transactionId: string, data: UpdateTransactionInput) {
    // Verify ownership
    await this.getById(userId, transactionId)

    const { tagIds, ...transactionData } = data

    return db.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        ...transactionData,
        ...(data.amount !== undefined && { amount: data.amount.toString() }),
        ...(data.postedAt && { postedAt: new Date(data.postedAt) }),
        ...(tagIds !== undefined && {
          txTags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({
              tagId,
              source: 'USER',
              confidence: 1.0,
            })),
          },
        }),
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
            type: true,
          },
        },
        category: true,
        txTags: {
          include: {
            tag: true,
          },
        },
      },
    })
  },

  /**
   * Delete a transaction
   */
  async delete(userId: string, transactionId: string) {
    // Verify ownership
    const transaction = await this.getById(userId, transactionId)

    // Update account balance
    const account = await db.account.findUnique({
      where: { id: transaction.accountId },
    })

    if (account) {
      const newBalance =
        parseFloat(account.balance.toString()) - parseFloat(transaction.amount.toString())

      await db.account.update({
        where: { id: transaction.accountId },
        data: { balance: newBalance.toString() },
      })
    }

    return db.transaction.delete({
      where: {
        id: transactionId,
      },
    })
  },
}
