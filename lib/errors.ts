import { z } from 'zod'

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, public issues?: z.ZodIssue[]) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}

/**
 * Generic error handler for API routes
 */
export function handleError(error: unknown): Response {
  console.error('API Error:', error)

  // Handle AppError instances
  if (error instanceof AppError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && error.issues
          ? { issues: error.issues }
          : {}),
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return Response.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        issues: error.issues,
      },
      { status: 400 }
    )
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: unknown }

    switch (prismaError.code) {
      case 'P2002':
        return Response.json(
          {
            error: 'A record with this value already exists',
            code: 'DUPLICATE_RECORD',
          },
          { status: 409 }
        )
      case 'P2025':
        return Response.json(
          {
            error: 'Record not found',
            code: 'NOT_FOUND',
          },
          { status: 404 }
        )
      case 'P2003':
        return Response.json(
          {
            error: 'Referenced record not found',
            code: 'FOREIGN_KEY_VIOLATION',
          },
          { status: 400 }
        )
      default:
        return Response.json(
          {
            error: 'Database error',
            code: 'DATABASE_ERROR',
          },
          { status: 500 }
        )
    }
  }

  // Handle unknown errors
  return Response.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  )
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandling<T extends (...args: never[]) => Promise<Response>>(
  handler: T
): (...args: Parameters<T>) => Promise<Response> {
  return async (...args: Parameters<T>): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleError(error)
    }
  }
}
