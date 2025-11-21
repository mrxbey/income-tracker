import { useState, useEffect, useCallback } from 'react'

interface UseFetchOptions<T> {
  /**
   * Initial data to use before fetch completes
   */
  initialData?: T
  /**
   * Whether to fetch immediately on mount
   * @default true
   */
  immediate?: boolean
  /**
   * Custom fetch options (headers, method, etc.)
   */
  fetchOptions?: RequestInit
  /**
   * Transform function to process the response data
   */
  transform?: (data: unknown) => T
  /**
   * Callback when fetch succeeds
   */
  onSuccess?: (data: T) => void
  /**
   * Callback when fetch fails
   */
  onError?: (error: Error) => void
}

interface UseFetchReturn<T> {
  /**
   * The fetched data
   */
  data: T | null
  /**
   * Loading state
   */
  loading: boolean
  /**
   * Error state
   */
  error: Error | null
  /**
   * Manually trigger a refetch
   */
  refetch: () => Promise<void>
  /**
   * Reset the hook state
   */
  reset: () => void
}

/**
 * Custom hook for fetching data with TypeScript support
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useFetch<Transaction[]>('/api/transactions')
 *
 * if (loading) return <Spinner />
 * if (error) return <Error message={error.message} />
 * return <TransactionList transactions={data} />
 * ```
 */
export function useFetch<T = unknown>(
  url: string | null,
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> {
  const {
    initialData = null,
    immediate = true,
    fetchOptions = {},
    transform,
    onSuccess,
    onError,
  } = options

  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState(immediate && url !== null)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!url) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url, fetchOptions)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const jsonData = await response.json()
      const transformedData = transform ? transform(jsonData) : (jsonData as T)

      setData(transformedData)
      onSuccess?.(transformedData)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      onError?.(error)
      console.error(`Error fetching ${url}:`, error)
    } finally {
      setLoading(false)
    }
  }, [url, fetchOptions, transform, onSuccess, onError])

  const reset = useCallback(() => {
    setData(initialData)
    setError(null)
    setLoading(false)
  }, [initialData])

  useEffect(() => {
    if (immediate && url) {
      fetchData()
    }
  }, [immediate, url, fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    reset,
  }
}

/**
 * Hook for POST requests
 */
export function usePost<TData = unknown, TBody = unknown>(
  url: string
): {
  post: (body: TBody) => Promise<TData>
  loading: boolean
  error: Error | null
} {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const post = useCallback(
    async (body: TBody): Promise<TData> => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return data as TData
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An unknown error occurred')
        setError(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [url]
  )

  return { post, loading, error }
}

/**
 * Hook for DELETE requests
 */
export function useDelete(
  url: string
): {
  deleteItem: () => Promise<void>
  loading: boolean
  error: Error | null
} {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteItem = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [url])

  return { deleteItem, loading, error }
}
