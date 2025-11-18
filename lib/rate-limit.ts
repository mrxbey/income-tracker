/**
 * Rate Limiting Utility
 *
 * Simple in-memory rate limiter for API routes.
 * For production with multiple servers, consider using Redis-based solution like @upstash/ratelimit.
 *
 * This provides basic DOS protection by limiting requests per IP address.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every 5 minutes
    if (typeof window === 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, 5 * 60 * 1000)
    }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Check if a request should be rate limited
   *
   * @param identifier - Unique identifier (usually IP address or user ID)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with success status and remaining requests
   */
  check(
    identifier: string,
    limit: number,
    windowMs: number
  ): {
    success: boolean
    remaining: number
    reset: number
  } {
    const now = Date.now()
    const entry = this.store.get(identifier)

    // First request or window expired
    if (!entry || entry.resetAt < now) {
      this.store.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      })
      return {
        success: true,
        remaining: limit - 1,
        reset: now + windowMs,
      }
    }

    // Increment count
    entry.count++

    // Check if limit exceeded
    if (entry.count > limit) {
      return {
        success: false,
        remaining: 0,
        reset: entry.resetAt,
      }
    }

    return {
      success: true,
      remaining: limit - entry.count,
      reset: entry.resetAt,
    }
  }

  /**
   * Reset rate limit for an identifier (useful for testing or manual overrides)
   */
  reset(identifier: string) {
    this.store.delete(identifier)
  }

  /**
   * Get current rate limit status without incrementing
   */
  getStatus(identifier: string): { count: number; resetAt: number } | null {
    const entry = this.store.get(identifier)
    if (!entry || entry.resetAt < Date.now()) {
      return null
    }
    return { count: entry.count, resetAt: entry.resetAt }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

// Singleton instance
const rateLimiter = new RateLimiter()

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // Strict limits for auth endpoints
  AUTH: {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Moderate limits for mutations
  MUTATION: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  // Relaxed limits for reads
  READ: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Very strict for expensive operations
  EXPENSIVE: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  },
} as const

/**
 * Get client identifier from request (IP address + user agent)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from various headers (for proxies/CDNs)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  const ip =
    cfConnectingIp ||
    realIp ||
    forwarded?.split(',')[0] ||
    'unknown'

  // Include user agent for better uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const userAgentHash = Buffer.from(userAgent).toString('base64').slice(0, 10)

  return `${ip}:${userAgentHash}`
}

/**
 * Apply rate limiting to a request
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = applyRateLimit(request, 'MUTATION')
 *   if (!rateLimitResult.success) {
 *     return rateLimitResult.response
 *   }
 *
 *   // Process request...
 * }
 * ```
 */
export function applyRateLimit(
  request: Request,
  type: keyof typeof RATE_LIMITS = 'READ',
  customIdentifier?: string
): {
  success: boolean
  remaining: number
  reset: number
  response?: Response
} {
  const config = RATE_LIMITS[type]
  const identifier = customIdentifier || getClientIdentifier(request)

  const result = rateLimiter.check(identifier, config.limit, config.windowMs)

  if (!result.success) {
    const resetDate = new Date(result.reset)

    return {
      success: false,
      remaining: 0,
      reset: result.reset,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again after ${resetDate.toISOString()}`,
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': config.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toString(),
          },
        }
      ),
    }
  }

  return {
    success: true,
    remaining: result.remaining,
    reset: result.reset,
  }
}

/**
 * Create rate limit headers to include in successful responses
 */
export function getRateLimitHeaders(
  type: keyof typeof RATE_LIMITS,
  remaining: number,
  reset: number
): Record<string, string> {
  const config = RATE_LIMITS[type]

  return {
    'X-RateLimit-Limit': config.limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  }
}

export { rateLimiter }
