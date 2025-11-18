import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST as createLinkToken } from '@/app/api/plaid/link-token/route'
import { POST as exchangeToken } from '@/app/api/plaid/exchange-token/route'
import { POST as syncTransactions } from '@/app/api/plaid/sync/route'
import * as plaidService from '@/lib/services/plaid-service'
import { db as prisma } from '@/lib/prisma'

// Mock authentication
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'test-user-123' })),
}))

// Mock Plaid service
vi.mock('@/lib/services/plaid-service', () => ({
  createLinkToken: vi.fn(),
  exchangePublicToken: vi.fn(),
  getAccounts: vi.fn(),
  syncTransactions: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    bankConnection: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    account: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    transaction: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

describe('Plaid API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/plaid/link-token', () => {
    it('should create a link token successfully', async () => {
      const mockLinkToken = {
        linkToken: 'link-sandbox-12345',
        expiration: new Date(Date.now() + 3600000).toISOString(),
      }

      vi.mocked(plaidService.createLinkToken).mockResolvedValue(mockLinkToken)

      const request = new Request('http://localhost:3000/api/plaid/link-token', {
        method: 'POST',
      })

      const response = await createLinkToken(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.linkToken).toBe('link-sandbox-12345')
      expect(plaidService.createLinkToken).toHaveBeenCalledWith('test-user-123')
    })

    it('should handle errors when creating link token', async () => {
      vi.mocked(plaidService.createLinkToken).mockRejectedValue(
        new Error('Plaid API error')
      )

      const request = new Request('http://localhost:3000/api/plaid/link-token', {
        method: 'POST',
      })

      const response = await createLinkToken(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create link token')
    })
  })

  describe('POST /api/plaid/exchange-token', () => {
    it('should exchange public token and create bank connection', async () => {
      const mockMetadata = {
        accessToken: 'access-sandbox-abc123',
        itemId: 'item-sandbox-xyz789',
        institutionId: 'ins_1',
        institutionName: 'Chase Bank',
      }

      const mockAccounts = [
        {
          accountId: 'acc-123',
          name: 'Checking',
          type: 'depository',
          subtype: 'checking',
          balances: {
            current: 1000,
            available: 950,
            currency: 'USD',
          },
        },
      ]

      const mockBankConnection = {
        id: 'bank-conn-1',
        userId: 'test-user-123',
        institutionId: 'ins_1',
        institutionName: 'Chase Bank',
        accessToken: 'access-sandbox-abc123',
        itemId: 'item-sandbox-xyz789',
        status: 'ACTIVE' as const,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockAccount = {
        id: 'account-1',
        userId: 'test-user-123',
        institutionId: null,
        bankConnectionId: 'bank-conn-1',
        plaidAccountId: 'acc-123',
        type: 'DEPOSIT' as const,
        name: 'Chase Bank Checking',
        currency: 'USD',
        countryCode: 'US',
        regionGroup: 'US',
        balance: 1000,
        lastSyncedAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(plaidService.exchangePublicToken).mockResolvedValue(mockMetadata)
      vi.mocked(plaidService.getAccounts).mockResolvedValue(mockAccounts)
      vi.mocked(prisma.bankConnection.create).mockResolvedValue(mockBankConnection)
      vi.mocked(prisma.account.create).mockResolvedValue(mockAccount)

      const request = new Request('http://localhost:3000/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken: 'public-sandbox-token' }),
      })

      const response = await exchangeToken(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connection).toBeDefined()
      expect(data.connection.institutionName).toBe('Chase Bank')
      expect(data.accounts).toHaveLength(1)
      expect(data.accounts[0].name).toBe('Chase Bank Checking')
    })

    it('should handle missing public token', async () => {
      const request = new Request('http://localhost:3000/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await exchangeToken(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing public token')
    })

    it('should map credit card account types correctly', async () => {
      const mockMetadata = {
        accessToken: 'access-sandbox-abc123',
        itemId: 'item-sandbox-xyz789',
        institutionId: 'ins_1',
        institutionName: 'Chase Bank',
      }

      const mockAccounts = [
        {
          accountId: 'acc-credit',
          name: 'Credit Card',
          type: 'credit',
          subtype: 'credit card',
          balances: { current: -500, available: 4500, currency: 'USD' },
        },
      ]

      vi.mocked(plaidService.exchangePublicToken).mockResolvedValue(mockMetadata)
      vi.mocked(plaidService.getAccounts).mockResolvedValue(mockAccounts)
      vi.mocked(prisma.bankConnection.create).mockResolvedValue({
        id: 'bank-conn-1',
        userId: 'test-user-123',
        institutionId: 'ins_1',
        institutionName: 'Chase Bank',
        accessToken: 'access-sandbox-abc123',
        itemId: 'item-sandbox-xyz789',
        status: 'ACTIVE',
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(prisma.account.create).mockResolvedValue({
        id: 'account-credit',
        userId: 'test-user-123',
        institutionId: null,
        bankConnectionId: 'bank-conn-1',
        plaidAccountId: 'acc-credit',
        type: 'CREDIT_CARD',
        name: 'Chase Bank Credit Card',
        currency: 'USD',
        countryCode: 'US',
        regionGroup: 'US',
        balance: -500,
        lastSyncedAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new Request('http://localhost:3000/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken: 'public-sandbox-token' }),
      })

      const response = await exchangeToken(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.accounts[0].type).toBe('CREDIT_CARD')
    })
  })

  describe('POST /api/plaid/sync', () => {
    it('should sync transactions from Plaid', async () => {
      const mockConnection = {
        id: 'bank-conn-1',
        userId: 'test-user-123',
        institutionId: 'ins_1',
        institutionName: 'Chase Bank',
        accessToken: 'access-sandbox-abc123',
        itemId: 'item-sandbox-xyz789',
        status: 'ACTIVE' as const,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockAccounts = [
        {
          id: 'account-1',
          userId: 'test-user-123',
          plaidAccountId: 'acc-123',
        },
      ]

      const mockPlaidTransactions = [
        {
          transactionId: 'txn-1',
          accountId: 'acc-123',
          amount: 50.00,
          date: '2024-01-15',
          name: 'Starbucks',
          merchantName: 'Starbucks',
          pending: false,
          currency: 'USD',
        },
        {
          transactionId: 'txn-2',
          accountId: 'acc-123',
          amount: -1500.00,
          date: '2024-01-16',
          name: 'Payroll Deposit',
          merchantName: null,
          pending: false,
          currency: 'USD',
        },
      ]

      const mockCreatedTransactions = [
        {
          id: 'trans-1',
          accountId: 'account-1',
          description: 'Starbucks',
          merchant: 'Starbucks',
          amount: 50.00,
          type: 'EXPENSE',
          isPending: false,
          postedAt: new Date('2024-01-15'),
        },
        {
          id: 'trans-2',
          accountId: 'account-1',
          description: 'Payroll Deposit',
          merchant: 'Payroll Deposit',
          amount: 1500.00,
          type: 'INCOME',
          isPending: false,
          postedAt: new Date('2024-01-16'),
        },
      ]

      vi.mocked(prisma.bankConnection.findUnique).mockResolvedValue(mockConnection)
      vi.mocked(plaidService.syncTransactions).mockResolvedValue(mockPlaidTransactions)
      vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts as any)
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.transaction.create)
        .mockResolvedValueOnce(mockCreatedTransactions[0] as any)
        .mockResolvedValueOnce(mockCreatedTransactions[1] as any)
      vi.mocked(prisma.bankConnection.update).mockResolvedValue(mockConnection)

      const request = new Request('http://localhost:3000/api/plaid/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: 'bank-conn-1' }),
      })

      const response = await syncTransactions(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.synced).toBe(2)
      expect(data.transactions).toHaveLength(2)
    })

    it('should handle missing connection ID', async () => {
      const request = new Request('http://localhost:3000/api/plaid/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await syncTransactions(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing connection ID')
    })

    it('should handle non-existent bank connection', async () => {
      vi.mocked(prisma.bankConnection.findUnique).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/plaid/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: 'invalid-id' }),
      })

      const response = await syncTransactions(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Bank connection not found')
    })

    it('should skip duplicate transactions', async () => {
      const mockConnection = {
        id: 'bank-conn-1',
        userId: 'test-user-123',
        institutionId: 'ins_1',
        institutionName: 'Test Bank',
        accessToken: 'access-token',
        itemId: 'item-1',
        status: 'ACTIVE' as const,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockAccounts = [
        {
          id: 'account-1',
          plaidAccountId: 'acc-123',
          userId: 'test-user-123',
        },
      ]

      const mockPlaidTransactions = [
        {
          transactionId: 'txn-exists',
          accountId: 'acc-123',
          amount: 50.00,
          date: '2024-01-15',
          name: 'Existing Transaction',
          merchantName: 'Test Merchant',
          pending: false,
          currency: 'USD',
        },
      ]

      const existingTransaction = {
        id: 'trans-existing',
        accountId: 'account-1',
        externalId: 'txn-exists',
        description: 'Existing Transaction',
        amount: 50.00,
        postedAt: new Date('2024-01-15'),
      }

      vi.mocked(prisma.bankConnection.findUnique).mockResolvedValue(mockConnection as any)
      vi.mocked(plaidService.syncTransactions).mockResolvedValue(mockPlaidTransactions)
      vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts as any)
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(existingTransaction as any)
      vi.mocked(prisma.bankConnection.update).mockResolvedValue(mockConnection as any)

      const request = new Request('http://localhost:3000/api/plaid/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: 'bank-conn-1' }),
      })

      const response = await syncTransactions(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.synced).toBe(1)
      expect(prisma.transaction.create).not.toHaveBeenCalled()
    })
  })
})
