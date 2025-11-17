import { db } from '@/lib/prisma'
import type { CreateAccountInput, UpdateAccountInput, AccountQueryInput } from '@/lib/validations'
import { NotFoundError } from '@/lib/errors'
import { Prisma } from '@prisma/client'

export const accountService = {
  /**
   * Get all accounts for a user
   */
  async getAll(userId: string, query?: AccountQueryInput) {
    const where: Prisma.AccountWhereInput = {
      userId,
      ...(query?.type && { type: query.type }),
      ...(query?.regionGroup && { regionGroup: query.regionGroup }),
      ...(query?.countryCode && { countryCode: query.countryCode }),
      ...(query?.isActive !== undefined && { isActive: query.isActive }),
    }

    return db.account.findMany({
      where,
      include: {
        institution: true,
        creditMeta: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  },

  /**
   * Get a single account by ID
   */
  async getById(userId: string, accountId: string) {
    const account = await db.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      include: {
        institution: true,
        creditMeta: true,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    if (!account) {
      throw new NotFoundError('Account')
    }

    return account
  },

  /**
   * Create a new account
   */
  async create(userId: string, data: CreateAccountInput) {
    const { creditMeta, ...accountData } = data

    return db.account.create({
      data: {
        ...accountData,
        balance: data.balance.toString(),
        userId,
        ...(creditMeta && {
          creditMeta: {
            create: creditMeta,
          },
        }),
      },
      include: {
        institution: true,
        creditMeta: true,
      },
    })
  },

  /**
   * Update an account
   */
  async update(userId: string, accountId: string, data: UpdateAccountInput) {
    // Verify ownership
    await this.getById(userId, accountId)

    const { creditMeta, ...accountData } = data

    return db.account.update({
      where: {
        id: accountId,
      },
      data: {
        ...accountData,
        ...(data.balance !== undefined && { balance: data.balance.toString() }),
        ...(creditMeta && {
          creditMeta: {
            upsert: {
              create: creditMeta,
              update: creditMeta,
            },
          },
        }),
      },
      include: {
        institution: true,
        creditMeta: true,
      },
    })
  },

  /**
   * Delete an account
   */
  async delete(userId: string, accountId: string) {
    // Verify ownership
    await this.getById(userId, accountId)

    return db.account.delete({
      where: {
        id: accountId,
      },
    })
  },

  /**
   * Get account balance summary by region
   */
  async getBalanceSummaryByRegion(userId: string) {
    const accounts = await this.getAll(userId)

    const summary = accounts.reduce(
      (acc, account) => {
        const region = account.regionGroup
        const balance = parseFloat(account.balance.toString())

        if (!acc[region]) {
          acc[region] = {
            totalBalance: 0,
            accounts: 0,
            currencies: new Set<string>(),
          }
        }

        acc[region].totalBalance += balance
        acc[region].accounts += 1
        acc[region].currencies.add(account.currency)

        return acc
      },
      {} as Record<
        string,
        {
          totalBalance: number
          accounts: number
          currencies: Set<string>
        }
      >
    )

    return Object.entries(summary).map(([region, data]) => ({
      region,
      totalBalance: data.totalBalance,
      accounts: data.accounts,
      currencies: Array.from(data.currencies),
    }))
  },
}
