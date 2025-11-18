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
   *
   * Uses database transaction to prevent race conditions in balance updates.
   * Atomically creates transaction and updates account balance.
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

    // Use database transaction to prevent race conditions
    const transaction = await db.$transaction(async (tx) => {
      // Create transaction
      const newTransaction = await tx.transaction.create({
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

      // Atomically update account balance using increment
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: newTransaction.amount,
          },
        },
      })

      return newTransaction
    })

    return transaction
  },

  /**
   * Update a transaction
   *
   * If amount is updated, uses database transaction to atomically update
   * transaction and adjust account balance by the difference.
   */
  async update(userId: string, transactionId: string, data: UpdateTransactionInput) {
    // Verify ownership
    const existingTransaction = await this.getById(userId, transactionId)

    const { tagIds, ...transactionData } = data

    // If amount is being updated, we need to adjust the account balance
    if (data.amount !== undefined) {
      const oldAmount = parseFloat(existingTransaction.amount.toString())
      const newAmount = parseFloat(data.amount.toString())
      const amountDifference = newAmount - oldAmount

      // Use database transaction to prevent race conditions
      return db.$transaction(async (tx) => {
        // Update transaction
        const updatedTransaction = await tx.transaction.update({
          where: {
            id: transactionId,
          },
          data: {
            ...transactionData,
            amount: data.amount.toString(),
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

        // Atomically adjust account balance by the difference
        await tx.account.update({
          where: { id: existingTransaction.accountId },
          data: {
            balance: {
              increment: amountDifference,
            },
          },
        })

        return updatedTransaction
      })
    }

    // If amount is not being updated, simple update without balance adjustment
    return db.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        ...transactionData,
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
   *
   * Uses database transaction to prevent race conditions in balance updates.
   * Atomically deletes transaction and updates account balance.
   */
  async delete(userId: string, transactionId: string) {
    // Verify ownership
    const transaction = await this.getById(userId, transactionId)

    // Use database transaction to prevent race conditions
    return db.$transaction(async (tx) => {
      // Atomically update account balance using decrement
      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            decrement: transaction.amount,
          },
        },
      })

      // Delete the transaction
      return tx.transaction.delete({
        where: {
          id: transactionId,
        },
      })
    })
  },
}
