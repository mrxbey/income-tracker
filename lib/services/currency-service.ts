import { db as prisma } from '@/lib/prisma'
import { ExchangeRateSource } from '@prisma/client'

export interface CurrencyConversion {
  fromCurrency: string
  toCurrency: string
  amount: number
  convertedAmount: number
  rate: number
  rateDate: Date
  source: ExchangeRateSource
}

export interface MultiCurrencyBalance {
  currency: string
  amount: number
  isBase: boolean
}

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(
  userId: string,
  fromCurrency: string,
  toCurrency: string
): Promise<{ rate: number; date: Date; source: ExchangeRateSource } | null> {
  if (fromCurrency === toCurrency) {
    return {
      rate: 1,
      date: new Date(),
      source: ExchangeRateSource.SYSTEM,
    }
  }

  // Try to get user's custom rate first
  const userRate = await prisma.exchangeRate.findFirst({
    where: {
      userId,
      fromCurrency,
      toCurrency,
    },
    orderBy: {
      date: 'desc',
    },
  })

  if (userRate) {
    return {
      rate: Number(userRate.rate),
      date: userRate.date,
      source: userRate.source,
    }
  }

  // Try system-wide rate
  const systemRate = await prisma.exchangeRate.findFirst({
    where: {
      userId: null,
      fromCurrency,
      toCurrency,
    },
    orderBy: {
      date: 'desc',
    },
  })

  if (systemRate) {
    return {
      rate: Number(systemRate.rate),
      date: systemRate.date,
      source: systemRate.source,
    }
  }

  // Try reverse rate (e.g., USD->TRY instead of TRY->USD)
  const reverseRate = await prisma.exchangeRate.findFirst({
    where: {
      OR: [
        { userId },
        { userId: null },
      ],
      fromCurrency: toCurrency,
      toCurrency: fromCurrency,
    },
    orderBy: {
      date: 'desc',
    },
  })

  if (reverseRate) {
    return {
      rate: 1 / Number(reverseRate.rate),
      date: reverseRate.date,
      source: reverseRate.source,
    }
  }

  return null
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  userId: string,
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<CurrencyConversion | null> {
  const exchangeRate = await getExchangeRate(userId, fromCurrency, toCurrency)

  if (!exchangeRate) {
    return null
  }

  return {
    fromCurrency,
    toCurrency,
    amount,
    convertedAmount: amount * exchangeRate.rate,
    rate: exchangeRate.rate,
    rateDate: exchangeRate.date,
    source: exchangeRate.source,
  }
}

/**
 * Save or update exchange rate
 */
export async function saveExchangeRate(
  userId: string | null,
  fromCurrency: string,
  toCurrency: string,
  rate: number,
  source: ExchangeRateSource = ExchangeRateSource.USER,
  notes?: string
) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if rate already exists for today
  const existing = await prisma.exchangeRate.findFirst({
    where: {
      userId,
      fromCurrency,
      toCurrency,
      date: {
        gte: today,
      },
    },
  })

  if (existing) {
    // Update existing rate
    return await prisma.exchangeRate.update({
      where: {
        id: existing.id,
      },
      data: {
        rate,
        source,
        notes,
      },
    })
  }

  // Create new rate
  return await prisma.exchangeRate.create({
    data: {
      userId,
      fromCurrency,
      toCurrency,
      rate,
      date: new Date(),
      source,
      notes,
    },
  })
}

/**
 * Get net worth in multiple currencies
 */
export async function getNetWorthInCurrencies(
  userId: string,
  targetCurrencies: string[]
): Promise<MultiCurrencyBalance[]> {
  // Get user's base currency
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  const baseCurrency = user?.baseCurrency || 'USD'

  // Calculate net worth in base currency
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      isActive: true,
    },
  })

  let netWorthInBase = 0
  for (const account of accounts) {
    const balance = Number(account.balance)

    // Convert account balance to base currency if needed
    if (account.currency === baseCurrency) {
      netWorthInBase += balance
    } else {
      const conversion = await convertCurrency(
        userId,
        balance,
        account.currency,
        baseCurrency
      )
      if (conversion) {
        netWorthInBase += conversion.convertedAmount
      }
    }
  }

  // Convert to all target currencies
  const balances: MultiCurrencyBalance[] = []

  for (const currency of targetCurrencies) {
    if (currency === baseCurrency) {
      balances.push({
        currency,
        amount: netWorthInBase,
        isBase: true,
      })
    } else {
      const conversion = await convertCurrency(
        userId,
        netWorthInBase,
        baseCurrency,
        currency
      )

      if (conversion) {
        balances.push({
          currency,
          amount: conversion.convertedAmount,
          isBase: false,
        })
      }
    }
  }

  return balances
}

/**
 * Get user's recent exchange rates
 */
export async function getUserExchangeRates(userId: string) {
  const rates = await prisma.exchangeRate.findMany({
    where: {
      userId,
    },
    orderBy: {
      date: 'desc',
    },
    take: 20,
  })

  return rates.map((rate) => ({
    id: rate.id,
    fromCurrency: rate.fromCurrency,
    toCurrency: rate.toCurrency,
    rate: Number(rate.rate),
    date: rate.date,
    source: rate.source,
    notes: rate.notes,
  }))
}
