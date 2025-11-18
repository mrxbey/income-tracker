import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  type LinkTokenCreateRequest,
  type ItemPublicTokenExchangeRequest,
  type TransactionsGetRequest,
  type AccountsGetRequest,
} from 'plaid'

/**
 * Plaid Service
 *
 * Handles all Plaid API interactions including:
 * - Link token creation for connecting bank accounts
 * - Public token exchange for access tokens
 * - Fetching transactions from connected accounts
 * - Managing bank account connections
 */

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
})

const plaidClient = new PlaidApi(configuration)

export interface PlaidLinkToken {
  linkToken: string
  expiration: string
}

export interface PlaidAccount {
  accountId: string
  name: string
  type: string
  subtype: string | null
  mask: string | null
  balances: {
    available: number | null
    current: number | null
    limit: number | null
    currency: string
  }
}

export interface PlaidTransaction {
  transactionId: string
  accountId: string
  amount: number
  currency: string
  date: string
  name: string
  merchantName: string | null
  category: string[] | null
  pending: boolean
  paymentChannel: string
}

export interface PlaidConnectionMetadata {
  institutionId: string
  institutionName: string
  accessToken: string
  itemId: string
}

/**
 * Create a Link token for initializing Plaid Link
 */
export async function createLinkToken(
  userId: string,
  clientName: string = 'Income Tracker'
): Promise<PlaidLinkToken> {
  try {
    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: clientName,
      products: [Products.Transactions],
      country_codes: [CountryCode.Us, CountryCode.Gb, CountryCode.Ca],
      language: 'en',
      webhook: process.env.PLAID_WEBHOOK_URL,
    }

    const response = await plaidClient.linkTokenCreate(request)

    return {
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    }
  } catch (error) {
    console.error('Error creating link token:', error)
    throw new Error('Failed to create Plaid link token')
  }
}

/**
 * Exchange public token for access token
 */
export async function exchangePublicToken(
  publicToken: string
): Promise<PlaidConnectionMetadata> {
  try {
    const request: ItemPublicTokenExchangeRequest = {
      public_token: publicToken,
    }

    const response = await plaidClient.itemPublicTokenExchange(request)

    // Get institution info
    const itemResponse = await plaidClient.itemGet({
      access_token: response.data.access_token,
    })

    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: itemResponse.data.item.institution_id!,
      country_codes: [CountryCode.Us],
    })

    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
      institutionId: institutionResponse.data.institution.institution_id,
      institutionName: institutionResponse.data.institution.name,
    }
  } catch (error) {
    console.error('Error exchanging public token:', error)
    throw new Error('Failed to exchange Plaid public token')
  }
}

/**
 * Get accounts for a connected item
 */
export async function getAccounts(accessToken: string): Promise<PlaidAccount[]> {
  try {
    const request: AccountsGetRequest = {
      access_token: accessToken,
    }

    const response = await plaidClient.accountsGet(request)

    return response.data.accounts.map((account) => ({
      accountId: account.account_id,
      name: account.name,
      type: account.type,
      subtype: account.subtype || null,
      mask: account.mask || null,
      balances: {
        available: account.balances.available || null,
        current: account.balances.current || null,
        limit: account.balances.limit || null,
        currency: account.balances.iso_currency_code || 'USD',
      },
    }))
  } catch (error) {
    console.error('Error fetching accounts:', error)
    throw new Error('Failed to fetch Plaid accounts')
  }
}

/**
 * Get transactions for a date range
 */
export async function getTransactions(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<PlaidTransaction[]> {
  try {
    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        count: 500,
        offset: 0,
      },
    }

    const response = await plaidClient.transactionsGet(request)

    return response.data.transactions.map((txn) => ({
      transactionId: txn.transaction_id,
      accountId: txn.account_id,
      amount: txn.amount,
      currency: txn.iso_currency_code || 'USD',
      date: txn.date,
      name: txn.name,
      merchantName: txn.merchant_name || null,
      category: txn.category || null,
      pending: txn.pending,
      paymentChannel: txn.payment_channel,
    }))
  } catch (error) {
    console.error('Error fetching transactions:', error)
    throw new Error('Failed to fetch Plaid transactions')
  }
}

/**
 * Sync transactions (for webhook updates)
 */
export async function syncTransactions(
  accessToken: string
): Promise<PlaidTransaction[]> {
  try {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
    })

    const transactions: PlaidTransaction[] = response.data.added.map((txn) => ({
      transactionId: txn.transaction_id,
      accountId: txn.account_id,
      amount: txn.amount,
      currency: txn.iso_currency_code || 'USD',
      date: txn.date,
      name: txn.name,
      merchantName: txn.merchant_name || null,
      category: txn.category || null,
      pending: txn.pending,
      paymentChannel: txn.payment_channel,
    }))

    return transactions
  } catch (error) {
    console.error('Error syncing transactions:', error)
    throw new Error('Failed to sync Plaid transactions')
  }
}

/**
 * Remove a connected item
 */
export async function removeItem(accessToken: string): Promise<void> {
  try {
    await plaidClient.itemRemove({
      access_token: accessToken,
    })
  } catch (error) {
    console.error('Error removing item:', error)
    throw new Error('Failed to remove Plaid item')
  }
}
