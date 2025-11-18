/**
 * Logger Utility
 *
 * Production-ready logging that:
 * - Respects environment (verbose in dev, minimal in production)
 * - Sanitizes sensitive data
 * - Provides structured logging
 * - Can be extended with external services (e.g., Sentry, DataDog)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production'
  private isTest = process.env.NODE_ENV === 'test'

  /**
   * Sensitive field patterns to redact from logs
   */
  private sensitivePatterns = [
    'password',
    'token',
    'secret',
    'apikey',
    'api_key',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'authorization',
    'cookie',
    'session',
    'ssn',
    'creditcard',
    'credit_card',
  ]

  /**
   * Sanitize an object by redacting sensitive fields
   */
  private sanitize(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item))
    }

    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase()
      const isSensitive = this.sensitivePatterns.some((pattern) =>
        lowerKey.includes(pattern)
      )

      if (isSensitive) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString()
    const sanitizedContext = context ? this.sanitize(context) : undefined

    if (this.isProduction) {
      // Structured logging for production (JSON format for log aggregation)
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...(sanitizedContext && { context: sanitizedContext }),
      })
    }

    // Human-readable format for development
    const contextStr = sanitizedContext
      ? `\n${JSON.stringify(sanitizedContext, null, 2)}`
      : ''
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`
  }

  /**
   * Debug - verbose logging for development only
   */
  debug(message: string, context?: LogContext): void {
    if (this.isTest || this.isProduction) return

    const formatted = this.formatMessage('debug', message, context)
    console.debug(formatted)
  }

  /**
   * Info - general information
   */
  info(message: string, context?: LogContext): void {
    if (this.isTest) return

    const formatted = this.formatMessage('info', message, context)
    console.info(formatted)
  }

  /**
   * Warn - warning messages
   */
  warn(message: string, context?: LogContext): void {
    if (this.isTest) return

    const formatted = this.formatMessage('warn', message, context)
    console.warn(formatted)
  }

  /**
   * Error - error messages
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.isTest) return

    const errorContext: LogContext = {
      ...context,
      ...(error instanceof Error && {
        error: {
          name: error.name,
          message: error.message,
          stack: this.isProduction ? undefined : error.stack,
        },
      }),
      ...(error && !(error instanceof Error) && {
        error: String(error),
      }),
    }

    const formatted = this.formatMessage('error', message, errorContext)
    console.error(formatted)

    // In production, send to error tracking service (e.g., Sentry)
    if (this.isProduction && typeof window !== 'undefined') {
      // Client-side error tracking
      // if (window.Sentry) {
      //   window.Sentry.captureException(error)
      // }
    }
  }

  /**
   * Log API request (for debugging)
   */
  apiRequest(method: string, path: string, context?: LogContext): void {
    this.debug(`API ${method} ${path}`, context)
  }

  /**
   * Log API response (for debugging)
   */
  apiResponse(
    method: string,
    path: string,
    status: number,
    duration?: number
  ): void {
    const level = status >= 400 ? 'warn' : 'debug'
    const message = `API ${method} ${path} - ${status}`
    const context = duration ? { durationMs: duration } : undefined

    if (level === 'warn') {
      this.warn(message, context)
    } else {
      this.debug(message, context)
    }
  }

  /**
   * Log database query (for debugging)
   */
  dbQuery(query: string, context?: LogContext): void {
    if (this.isProduction) return
    this.debug(`DB Query: ${query}`, context)
  }
}

// Singleton instance
export const logger = new Logger()

// Convenience exports
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  api: {
    request: logger.apiRequest.bind(logger),
    response: logger.apiResponse.bind(logger),
  },
  db: logger.dbQuery.bind(logger),
}
