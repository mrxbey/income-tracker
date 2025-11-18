'use client'

import { useEffect, useState } from 'react'
import { PlaidLink } from '@/components/features/plaid/PlaidLink'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Building2,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface BankConnection {
  id: string
  institutionName: string
  institutionId: string
  status: 'ACTIVE' | 'ERROR' | 'DISCONNECTED'
  lastSyncAt: string | null
  createdAt: string
  accounts: Array<{
    id: string
    name: string
    type: string
    balance: number
    currency: string
  }>
}

export default function BankConnectionsPage() {
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  const fetchConnections = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bank-connections')

      if (!response.ok) {
        throw new Error('Failed to fetch connections')
      }

      const data = await response.json()
      setConnections(data.connections || [])
    } catch (error) {
      console.error('Error fetching connections:', error)
      toast.error('Failed to load bank connections')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  const handleSync = async (connectionId: string) => {
    try {
      setSyncing(connectionId)

      const response = await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to sync transactions')
      }

      const data = await response.json()

      toast.success(`Synced ${data.synced} transactions`)
      await fetchConnections()
    } catch (error) {
      console.error('Error syncing:', error)
      toast.error('Failed to sync transactions')
    } finally {
      setSyncing(null)
    }
  }

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this bank?')) {
      return
    }

    try {
      const response = await fetch(`/api/bank-connections/${connectionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      toast.success('Bank disconnected')
      await fetchConnections()
    } catch (error) {
      console.error('Error disconnecting:', error)
      toast.error('Failed to disconnect bank')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bank Connections</h2>
          <p className="text-muted-foreground">
            Connect your bank accounts to automatically import transactions
          </p>
        </div>
        <PlaidLink onSuccess={fetchConnections} />
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your bank connection is secure and encrypted. We use Plaid to connect to your bank.
          Your credentials are never stored.
        </AlertDescription>
      </Alert>

      {/* Connections List */}
      {connections.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">No bank connections</CardTitle>
            <CardDescription>
              Connect your first bank account to get started with automatic transaction imports
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <PlaidLink onSuccess={fetchConnections} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <CardTitle>{connection.institutionName}</CardTitle>
                      <Badge
                        variant={
                          connection.status === 'ACTIVE'
                            ? 'default'
                            : connection.status === 'ERROR'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {connection.status === 'ACTIVE' && (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        )}
                        {connection.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {connection.accounts.length} account(s) connected
                      {connection.lastSyncAt && (
                        <> · Last synced {format(new Date(connection.lastSyncAt), 'PPp')}</>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(connection.id)}
                      disabled={syncing === connection.id}
                    >
                      {syncing === connection.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Sync
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDisconnect(connection.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {connection.accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {account.type.toLowerCase().replace('_', ' ')}
                        </p>
                      </div>
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number(account.balance), account.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
