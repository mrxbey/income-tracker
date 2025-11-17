import { z } from 'zod'
import {
  AccountType,
  TxnType,
  Period,
  TransactionSource,
  ExchangeRateSource,
} from '@prisma/client'

// ========== ACCOUNT SCHEMAS ==========

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.nativeEnum(AccountType),
  currency: z.string().length(3, 'Currency must be 3 characters (e.g., TRY, USD, GBP)'),
  countryCode: z.string().length(2, 'Country code must be 2 characters (e.g., TR, GB)'),
  regionGroup: z.string().min(2).max(10),
  balance: z.number().or(z.string().transform((val) => parseFloat(val))),
  institutionId: z.string().optional(),
  creditMeta: z
    .object({
      apr: z.number().optional(),
      creditLimit: z.number().optional(),
      statementDay: z.number().min(1).max(31).optional(),
      paymentDay: z.number().min(1).max(31).optional(),
      minPaymentRate: z.number().optional(),
      annualFee: z.number().optional(),
      issuer: z.string().optional(),
    })
    .optional(),
})

export const updateAccountSchema = createAccountSchema.partial()

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>

// ========== TRANSACTION SCHEMAS ==========

export const createTransactionSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  postedAt: z.string().or(z.date()),
  amount: z.number().or(z.string().transform((val) => parseFloat(val))),
  currency: z.string().length(3),
  description: z.string().min(1, 'Description is required'),
  merchant: z.string().optional(),
  type: z.nativeEnum(TxnType),
  categoryId: z.string().optional(),
  source: z.nativeEnum(TransactionSource).default('MANUAL'),
  tagIds: z.array(z.string()).optional(),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>

// ========== CATEGORY SCHEMAS ==========

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  parentId: z.string().optional(),
  type: z.nativeEnum(TxnType),
  icon: z.string().optional(),
  color: z.string().optional(),
})

export const updateCategorySchema = createCategorySchema.partial()

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

// ========== TAG SCHEMAS ==========

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50),
  color: z.string().optional(),
})

export const updateTagSchema = createTagSchema.partial()

export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>

// ========== FIXED EXPENSE SCHEMAS ==========

export const createFixedExpenseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number().positive('Amount must be positive').or(z.string().transform((val) => parseFloat(val))),
  currency: z.string().length(3),
  period: z.nativeEnum(Period),
  interval: z.number().positive().optional(),
  nextDueAt: z.string().or(z.date()),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  lifeDomain: z.string().optional(),
  countryCode: z.string().length(2).optional(),
})

export const updateFixedExpenseSchema = createFixedExpenseSchema.partial()

export type CreateFixedExpenseInput = z.infer<typeof createFixedExpenseSchema>
export type UpdateFixedExpenseInput = z.infer<typeof updateFixedExpenseSchema>

// ========== INCOME SOURCE SCHEMAS ==========

export const createIncomeSourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number().positive('Amount must be positive').or(z.string().transform((val) => parseFloat(val))),
  currency: z.string().length(3),
  period: z.nativeEnum(Period),
  interval: z.number().positive().optional(),
  nextExpectedAt: z.string().or(z.date()),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  variability: z.number().min(0).max(1).optional(),
})

export const updateIncomeSourceSchema = createIncomeSourceSchema.partial()

export type CreateIncomeSourceInput = z.infer<typeof createIncomeSourceSchema>
export type UpdateIncomeSourceInput = z.infer<typeof updateIncomeSourceSchema>

// ========== INSTALLMENT PLAN SCHEMAS ==========

export const createInstallmentPlanSchema = z.object({
  cardAccountId: z.string().min(1, 'Card account is required'),
  merchant: z.string().optional(),
  description: z.string().optional(),
  totalAmount: z.number().positive().or(z.string().transform((val) => parseFloat(val))),
  numInstallments: z.number().int().positive().min(2),
  installmentAmount: z.number().positive().or(z.string().transform((val) => parseFloat(val))),
  firstDueAt: z.string().or(z.date()),
  frequencyDays: z.number().int().positive().default(30),
  source: z.string().default('MANUAL'),
})

export const updateInstallmentPlanSchema = createInstallmentPlanSchema.partial()

export type CreateInstallmentPlanInput = z.infer<typeof createInstallmentPlanSchema>
export type UpdateInstallmentPlanInput = z.infer<typeof updateInstallmentPlanSchema>

// ========== EXCHANGE RATE SCHEMAS ==========

export const createExchangeRateSchema = z.object({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  rate: z.number().positive().or(z.string().transform((val) => parseFloat(val))),
  date: z.string().or(z.date()).optional(),
  source: z.nativeEnum(ExchangeRateSource).default('USER'),
  notes: z.string().optional(),
})

export const updateExchangeRateSchema = createExchangeRateSchema.partial()

export type CreateExchangeRateInput = z.infer<typeof createExchangeRateSchema>
export type UpdateExchangeRateInput = z.infer<typeof updateExchangeRateSchema>

// ========== TAG RULE SCHEMAS ==========

export const createTagRuleSchema = z.object({
  pattern: z.string().min(1, 'Pattern is required'),
  patternType: z.enum(['MERCHANT_CONTAINS', 'MERCHANT_EQUALS', 'REGEX', 'DESCRIPTION_CONTAINS']),
  tagIds: z.array(z.string()).min(1, 'At least one tag is required'),
  categoryId: z.string().optional(),
  priority: z.number().int().default(0),
})

export const updateTagRuleSchema = createTagRuleSchema.partial()

export type CreateTagRuleInput = z.infer<typeof createTagRuleSchema>
export type UpdateTagRuleInput = z.infer<typeof updateTagRuleSchema>

// ========== QUERY SCHEMAS ==========

export const transactionQuerySchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
  type: z.nativeEnum(TxnType).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
})

export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>

export const accountQuerySchema = z.object({
  type: z.nativeEnum(AccountType).optional(),
  regionGroup: z.string().optional(),
  countryCode: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type AccountQueryInput = z.infer<typeof accountQuerySchema>
