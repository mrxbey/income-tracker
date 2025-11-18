import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET as getBankConnections } from '@/app/api/bank-connections/route'
import { DELETE as deleteBankConnection } from '@/app/api/bank-connections/[id]/route'
import * as plaidService from '@/lib/services/plaid-service'
import { db as prisma } from '@/lib/prisma'

// Mock authentication
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'test-user-123' })),
}))

// Mock Plaid service
vi.mock('@/lib/services/plaid-service', () => ({
  removeItem: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  db: {
    bankConnection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('Bank Connections API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/bank-connections', () => {
    it('should return all bank connections for authenticated user', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          userId: 'test-user-123',
          institutionId: 'ins_1',
          institutionName: 'Chase Bank',
          accessToken: 'access-token-1',
          itemId: 'item-1',
          status: 'ACTIVE',
          lastSyncAt: new Date('2024-01-15'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          accounts: [
            {
              id: 'acc-1',
              name: 'Checking',
              type: 'DEPOSIT',
              balance: 1000,
              currency: 'USD',
            },
          ],
        },
        {
          id: 'conn-2',
          userId: 'test-user-123',
          institutionId: 'ins_2',
          institutionName: 'Bank of America',
          accessToken: 'access-token-2',
          itemId: 'item-2',
          status: 'ACTIVE',
          lastSyncAt: null,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
          accounts: [
            {
              id: 'acc-2',
              name: 'Savings',
              type: 'DEPOSIT',
              balance: 5000,
              currency: 'USD',
            },
          ],
        },
      ]

      vi.mocked(prisma.bankConnection.findMany).mockResolvedValue(mockConnections as any)

      const request = new Request('http://localhost:3000/api/bank-connections', {
        method: 'GET',
      })

      const response = await getBankConnections(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connections).toHaveLength(2)
      expect(data.connections[0].institutionName).toBe('Chase Bank')
      expect(data.connections[0].accounts).toHaveLength(1)
      expect(data.connections[1].institutionName).toBe('Bank of America')
      expect(prisma.bankConnection.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-123' },
        include: {
          accounts: {
            select: {
              id: true,
              name: true,
              type: true,
              balance: true,
              currency: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty array when user has no connections', async () => {
      vi.mocked(prisma.bankConnection.findMany).mockResolvedValue([])

      const request = new Request('http://localhost:3000/api/bank-connections', {
        method: 'GET',
      })

      const response = await getBankConnections(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connections).toHaveLength(0)
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.bankConnection.findMany).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new Request('http://localhost:3000/api/bank-connections', {
        method: 'GET',
      })

      const response = await getBankConnections(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch bank connections')
    })
  })

  describe('DELETE /api/bank-connections/[id]', () => {
    it('should delete bank connection and revoke Plaid access', async () => {
      const mockConnection = {
        id: 'conn-1',
        userId: 'test-user-123',
        institutionId: 'ins_1',
        institutionName: 'Chase Bank',
        accessToken: 'access-token-1',
        itemId: 'item-1',
        status: 'ACTIVE' as const,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.bankConnection.findUnique).mockResolvedValue(mockConnection)
      vi.mocked(plaidService.removeItem).mockResolvedValue()
      vi.mocked(prisma.bankConnection.delete).mockResolvedValue(mockConnection)

      const request = new Request('http://localhost:3000/api/bank-connections/conn-1', {
        method: 'DELETE',
      })

      const response = await deleteBankConnection(request, { params: { id: 'conn-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(plaidService.removeItem).toHaveBeenCalledWith('access-token-1')
      expect(prisma.bankConnection.delete).toHaveBeenCalledWith({
        where: { id: 'conn-1' },
      })
    })

    it('should return 404 if connection not found', async () => {
      vi.mocked(prisma.bankConnection.findUnique).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/bank-connections/invalid-id', {
        method: 'DELETE',
      })

      const response = await deleteBankConnection(request, { params: { id: 'invalid-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Bank connection not found')
    })

    it('should return 404 if trying to delete another users connection', async () => {
      // When querying with {id, userId}, a connection belonging to another user won't be found
      vi.mocked(prisma.bankConnection.findUnique).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/bank-connections/conn-1', {
        method: 'DELETE',
      })

      const response = await deleteBankConnection(request, { params: { id: 'conn-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Bank connection not found')
      expect(plaidService.removeItem).not.toHaveBeenCalled()
      expect(prisma.bankConnection.delete).not.toHaveBeenCalled()
    })

    it('should still delete connection even if Plaid revocation fails', async () => {
      const mockConnection = {
        id: 'conn-1',
        userId: 'test-user-123',
        accessToken: 'access-token-1',
        status: 'ACTIVE' as const,
      }

      vi.mocked(prisma.bankConnection.findUnique).mockResolvedValue(mockConnection as any)
      vi.mocked(plaidService.removeItem).mockRejectedValue(new Error('Plaid API error'))
      vi.mocked(prisma.bankConnection.delete).mockResolvedValue(mockConnection as any)

      const request = new Request('http://localhost:3000/api/bank-connections/conn-1', {
        method: 'DELETE',
      })

      const response = await deleteBankConnection(request, { params: { id: 'conn-1' } })
      const data = await response.json()

      // Should still succeed even if Plaid revocation fails
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.bankConnection.delete).toHaveBeenCalled()
    })

    it('should handle database deletion errors', async () => {
      const mockConnection = {
        id: 'conn-1',
        userId: 'test-user-123',
        accessToken: 'access-token-1',
        status: 'ACTIVE' as const,
      }

      vi.mocked(prisma.bankConnection.findUnique).mockResolvedValue(mockConnection as any)
      vi.mocked(plaidService.removeItem).mockResolvedValue()
      vi.mocked(prisma.bankConnection.delete).mockRejectedValue(
        new Error('Database error')
      )

      const request = new Request('http://localhost:3000/api/bank-connections/conn-1', {
        method: 'DELETE',
      })

      const response = await deleteBankConnection(request, { params: { id: 'conn-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to disconnect bank')
    })
  })

  describe('Bank Connection Status', () => {
    it('should correctly show ERROR status connections', async () => {
      const mockConnections = [
        {
          id: 'conn-error',
          userId: 'test-user-123',
          institutionName: 'Broken Bank',
          status: 'ERROR',
          lastSyncAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          accounts: [],
        },
      ]

      vi.mocked(prisma.bankConnection.findMany).mockResolvedValue(mockConnections as any)

      const request = new Request('http://localhost:3000/api/bank-connections', {
        method: 'GET',
      })

      const response = await getBankConnections(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connections[0].status).toBe('ERROR')
    })

    it('should correctly show DISCONNECTED status connections', async () => {
      const mockConnections = [
        {
          id: 'conn-disconnected',
          userId: 'test-user-123',
          institutionName: 'Old Bank',
          status: 'DISCONNECTED',
          lastSyncAt: new Date('2023-12-01'),
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2024-01-01'),
          accounts: [],
        },
      ]

      vi.mocked(prisma.bankConnection.findMany).mockResolvedValue(mockConnections as any)

      const request = new Request('http://localhost:3000/api/bank-connections', {
        method: 'GET',
      })

      const response = await getBankConnections(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connections[0].status).toBe('DISCONNECTED')
    })
  })
})
