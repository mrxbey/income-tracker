import { db as prisma } from '@/lib/prisma'
import { TxnType } from '@prisma/client'

export interface ExportOptions {
  userId: string
  format: 'CSV' | 'JSON'
  dateFrom?: Date
  dateTo?: Date
  categoryIds?: string[]
  accountIds?: string[]
  types?: TxnType[]
}

export interface TransactionExport {
  date: string
  description: string
  merchant: string
  category: string
  account: string
  amount: number
  currency: string
  type: string
  tags: string
}

/**
 * Export transactions to CSV format
 */
export async function exportTransactionsToCSV(options: ExportOptions): Promise<string> {
  const transactions = await getTransactionsForExport(options)

  // CSV header
  const headers = [
    'Date',
    'Description',
    'Merchant',
    'Category',
    'Account',
    'Amount',
    'Currency',
    'Type',
    'Tags',
  ]

  // CSV rows
  const rows = transactions.map((txn) => [
    txn.date,
    escapeCSV(txn.description),
    escapeCSV(txn.merchant),
    escapeCSV(txn.category),
    escapeCSV(txn.account),
    txn.amount.toString(),
    txn.currency,
    txn.type,
    escapeCSV(txn.tags),
  ])

  // Combine header and rows
  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')

  return csv
}

/**
 * Export transactions to JSON format
 */
export async function exportTransactionsToJSON(options: ExportOptions): Promise<string> {
  const transactions = await getTransactionsForExport(options)
  return JSON.stringify(transactions, null, 2)
}

/**
 * Export budget summary
 */
export async function exportBudgetSummary(options: {
  userId: string
  month?: Date
}): Promise<string> {
  const budgets = await prisma.budget.findMany({
    where: { userId: options.userId, isActive: true },
    include: { category: true },
  })

  const now = options.month || new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Get spending by category
  const spending = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      account: { userId: options.userId },
      type: TxnType.EXPENSE,
      postedAt: { gte: monthStart, lte: monthEnd },
      categoryId: { in: budgets.map((b) => b.categoryId) },
    },
    _sum: { amount: true },
  })

  const spendingMap: Record<string, number> = {}
  for (const s of spending) {
    if (s.categoryId) {
      spendingMap[s.categoryId] = Math.abs(Number(s._sum.amount))
    }
  }

  // CSV header
  const headers = ['Category', 'Budget', 'Actual', 'Remaining', 'Percentage', 'Status']

  // CSV rows
  const rows = budgets.map((budget) => {
    const budgetAmount = Number(budget.amount)
    const actualAmount = spendingMap[budget.categoryId] || 0
    const remaining = budgetAmount - actualAmount
    const percentage = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0
    const status = actualAmount > budgetAmount ? 'Over Budget' : 'On Track'

    return [
      escapeCSV(budget.category.name),
      budgetAmount.toFixed(2),
      actualAmount.toFixed(2),
      remaining.toFixed(2),
      `${percentage.toFixed(1)}%`,
      status,
    ]
  })

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
  return csv
}

/**
 * Export net worth history
 */
export async function exportNetWorthHistory(options: {
  userId: string
  daysBack?: number
}): Promise<string> {
  const days = options.daysBack || 365
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: {
      userId: options.userId,
      takenAt: { gte: startDate },
    },
    orderBy: { takenAt: 'asc' },
  })

  // CSV header
  const headers = [
    'Date',
    'Assets',
    'Liabilities',
    'Net Worth',
    'Cash',
    'Investments',
    'Receivables',
    'Credit Cards',
    'Loans',
  ]

  // CSV rows
  const rows = snapshots.map((snapshot) => [
    snapshot.takenAt.toISOString().split('T')[0],
    Number(snapshot.assets).toFixed(2),
    Number(snapshot.liabilities).toFixed(2),
    Number(snapshot.netWorth).toFixed(2),
    Number(snapshot.assetCash).toFixed(2),
    Number(snapshot.assetInvestments).toFixed(2),
    Number(snapshot.assetReceivables).toFixed(2),
    Number(snapshot.liabilityCreditCards).toFixed(2),
    Number(snapshot.liabilityLoans).toFixed(2),
  ])

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
  return csv
}

/**
 * Export category summary
 */
export async function exportCategorySummary(options: {
  userId: string
  dateFrom?: Date
  dateTo?: Date
}): Promise<string> {
  const categories = await prisma.category.findMany({
    where: { userId: options.userId },
  })

  const categoryMap: Record<string, string> = {}
  for (const cat of categories) {
    categoryMap[cat.id] = cat.name
  }

  const summary = await prisma.transaction.groupBy({
    by: ['categoryId', 'type'],
    where: {
      account: { userId: options.userId },
      ...(options.dateFrom || options.dateTo
        ? {
            postedAt: {
              ...(options.dateFrom ? { gte: options.dateFrom } : {}),
              ...(options.dateTo ? { lte: options.dateTo } : {}),
            },
          }
        : {}),
    },
    _sum: { amount: true },
    _count: true,
  })

  // CSV header
  const headers = ['Category', 'Type', 'Total Amount', 'Transaction Count']

  // CSV rows
  const rows = summary.map((item) => [
    item.categoryId ? escapeCSV(categoryMap[item.categoryId] || 'Uncategorized') : 'Uncategorized',
    item.type,
    Math.abs(Number(item._sum.amount)).toFixed(2),
    item._count.toString(),
  ])

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
  return csv
}

/**
 * Helper function to get transactions for export
 */
async function getTransactionsForExport(options: ExportOptions): Promise<TransactionExport[]> {
  const transactions = await prisma.transaction.findMany({
    where: {
      account: {
        userId: options.userId,
        ...(options.accountIds && options.accountIds.length > 0
          ? { id: { in: options.accountIds } }
          : {}),
      },
      ...(options.dateFrom || options.dateTo
        ? {
            postedAt: {
              ...(options.dateFrom ? { gte: options.dateFrom } : {}),
              ...(options.dateTo ? { lte: options.dateTo } : {}),
            },
          }
        : {}),
      ...(options.categoryIds && options.categoryIds.length > 0
        ? { categoryId: { in: options.categoryIds } }
        : {}),
      ...(options.types && options.types.length > 0 ? { type: { in: options.types } } : {}),
    },
    include: {
      category: true,
      account: true,
      txTags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: {
      postedAt: 'desc',
    },
  })

  return transactions.map((txn) => ({
    date: txn.postedAt.toISOString().split('T')[0]!,
    description: txn.description,
    merchant: txn.merchant || '',
    category: txn.category?.name || 'Uncategorized',
    account: txn.account.name,
    amount: Number(txn.amount),
    currency: txn.currency,
    type: txn.type,
    tags: txn.txTags.map((tt) => tt.tag.name).join('; '),
  }))
}

/**
 * Escape CSV values
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
