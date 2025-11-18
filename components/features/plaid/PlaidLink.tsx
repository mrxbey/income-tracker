'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOptions } from 'react-plaid-link'
import { Button } from '@/components/ui/button'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface PlaidLinkProps {
  onSuccess?: () => void
  buttonText?: string
  variant?: 'default' | 'outline' | 'ghost'
}

export function PlaidLink({
  onSuccess,
  buttonText = 'Connect Bank Account',
  variant = 'default',
}: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch link token on mount
  useEffect(() => {
    async function fetchLinkToken() {
      try {
        const response = await fetch('/api/plaid/link-token', {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to create link token')
        }

        const data = await response.json()
        setLinkToken(data.linkToken)
      } catch (error) {
        console.error('Error fetching link token:', error)
        toast.error('Failed to initialize Plaid Link')
      }
    }

    fetchLinkToken()
  }, [])

  // Handle successful account linking
  const handleSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken, _metadata) => {
      try {
        setLoading(true)

        // Exchange public token for access token
        const response = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ publicToken }),
        })

        if (!response.ok) {
          throw new Error('Failed to exchange token')
        }

        const data = await response.json()

        toast.success(`Connected ${data.connection.institutionName}!`, {
          description: `${data.accounts.length} account(s) linked successfully`,
        })

        // Call success callback
        onSuccess?.()
      } catch (error) {
        console.error('Error exchanging token:', error)
        toast.error('Failed to connect bank account')
      } finally {
        setLoading(false)
      }
    },
    [onSuccess]
  )

  // Plaid Link configuration
  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: (error) => {
      if (error) {
        console.error('Plaid Link error:', error)
        toast.error('Bank connection cancelled')
      }
    },
  }

  const { open, ready } = usePlaidLink(config)

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || loading}
      variant={variant}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  )
}
