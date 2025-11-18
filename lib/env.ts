import { z } from 'zod'

/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at application startup.
 * Provides helpful error messages for missing or invalid configuration.
 *
 * This runs once at server startup to catch configuration errors early.
 */

// Schema for server-side environment variables
const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),
  DIRECT_URL: z.string().url('DIRECT_URL must be a valid PostgreSQL connection URL'),

  // Authentication (Clerk)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),

  // AI APIs (Gemini is required for transaction categorization)
  GOOGLE_GEMINI_API_KEY: z
    .string()
    .min(1, 'GOOGLE_GEMINI_API_KEY is required for AI transaction categorization'),

  // OpenAI is optional (for future features)
  OPENAI_API_KEY: z.string().optional(),

  // Plaid (Bank Connections)
  PLAID_CLIENT_ID: z
    .string()
    .min(1, 'PLAID_CLIENT_ID is required for bank connections'),
  PLAID_SECRET: z
    .string()
    .min(1, 'PLAID_SECRET is required for bank connections'),
  PLAID_ENV: z
    .enum(['sandbox', 'development', 'production'])
    .default('sandbox'),
  PLAID_WEBHOOK_URL: z.string().url().optional(),

  // Security
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes)')
    .regex(
      /^[0-9a-f]{64}$/i,
      'ENCRYPTION_KEY must contain only hexadecimal characters (0-9, a-f)'
    ),

  // Supabase Storage
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_KEY is required'),

  // App Configuration
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .default('http://localhost:3000'),
  NEXT_PUBLIC_BASE_CURRENCY: z
    .string()
    .length(3, 'NEXT_PUBLIC_BASE_CURRENCY must be a 3-letter currency code (e.g., USD, EUR, TRY)')
    .default('TRY'),

  // Cron Secret (for scheduled jobs)
  CRON_SECRET: z
    .string()
    .min(16, 'CRON_SECRET must be at least 16 characters for security'),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

// Schema for client-side (public) environment variables
const clientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_BASE_CURRENCY: z.string().length(3),
})

/**
 * Validate server environment variables
 *
 * Call this at application startup (e.g., in root layout or middleware).
 * Throws detailed error if any required variables are missing or invalid.
 */
export function validateServerEnv() {
  try {
    const env = serverEnvSchema.parse(process.env)
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => {
        const path = err.path.join('.')
        return `  ❌ ${path}: ${err.message}`
      })

      const errorMessage = [
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🚨 ENVIRONMENT VARIABLE VALIDATION FAILED',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        'The following environment variables are missing or invalid:',
        '',
        ...missingVars,
        '',
        '📝 To fix this:',
        '  1. Copy .env.example to .env.local',
        '  2. Fill in all required values',
        '  3. For ENCRYPTION_KEY, generate with:',
        '     node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
        '',
        '📚 See .env.example for all required variables and their formats.',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
      ].join('\n')

      console.error(errorMessage)
      throw new Error('Environment validation failed. Check console for details.')
    }
    throw error
  }
}

/**
 * Validate client environment variables
 *
 * Use this in client components to ensure public env vars are available.
 */
export function validateClientEnv() {
  try {
    const env = clientEnvSchema.parse({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_BASE_CURRENCY: process.env.NEXT_PUBLIC_BASE_CURRENCY,
    })
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Client environment validation failed:', error.errors)
    }
    throw error
  }
}

/**
 * Type-safe access to environment variables
 *
 * Use this instead of process.env for type safety and validation.
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

// Validate on module load in server context
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  validateServerEnv()
}
