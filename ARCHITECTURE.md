# Income Tracker - Architecture & Best Practices

**Version:** 1.0
**Date:** 2025-11-17

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Design Principles](#design-principles)
3. [Directory Structure](#directory-structure)
4. [Data Flow](#data-flow)
5. [Security](#security)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling](#error-handling)
8. [Code Standards](#code-standards)
9. [API Design Patterns](#api-design-patterns)
10. [State Management](#state-management)
11. [Testing Patterns](#testing-patterns)
12. [Deployment Architecture](#deployment-architecture)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Next.js App (React Components)             │ │
│  │  • Server Components (default)                     │ │
│  │  • Client Components (interactive)                 │ │
│  │  • Route Handlers (API)                            │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Vercel Edge Network                    │
│  • CDN Caching                                          │
│  • Edge Functions                                       │
│  • Automatic SSL                                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js API Routes (Serverless)             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   CRUD APIs │  │  AI APIs    │  │  Cron Jobs  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
           │              │                   │
           │              │                   │
           ▼              ▼                   ▼
┌────────────────┐  ┌──────────┐  ┌───────────────────┐
│   Supabase     │  │  Gemini  │  │     OpenAI        │
│   PostgreSQL   │  │  2.5 API │  │   GPT-4 API       │
│   + Storage    │  └──────────┘  └───────────────────┘
└────────────────┘
           │
           ▼
┌────────────────┐
│  Clerk Auth    │
└────────────────┘
```

### Tech Stack Layers

**Layer 1: Presentation (Client)**
- React 18+ with Server Components
- Tailwind CSS for styling
- shadcn/ui for components
- Recharts for visualizations

**Layer 2: Application (Server)**
- Next.js 14+ App Router
- TypeScript for type safety
- API Route Handlers
- Server Actions (for mutations)

**Layer 3: Business Logic**
- Zod for validation
- Custom utilities (forecasting, FX, classification)
- AI integration wrappers

**Layer 4: Data Access**
- Prisma ORM
- Database connection pooling
- Query optimization

**Layer 5: External Services**
- Supabase (database + storage)
- Clerk (authentication)
- Gemini 2.5 (document AI)
- OpenAI (conversational AI)
- FX rates API

---

## Design Principles

### 1. Server-First Architecture

**Default to Server Components:**
```tsx
// ✅ Good: Server Component (default)
// app/(dashboard)/accounts/page.tsx
import { db } from '@/lib/prisma'

export default async function AccountsPage() {
  const accounts = await db.account.findMany({
    where: { userId: auth().userId }
  })

  return <AccountList accounts={accounts} />
}
```

**Use Client Components only when needed:**
```tsx
// app/(dashboard)/accounts/page.tsx
import { AccountList } from './account-list'

// components/accounts/account-list.tsx
'use client'

export function AccountList({ accounts }) {
  const [filter, setFilter] = useState('')
  // Interactive logic here
}
```

### 2. Type Safety Everywhere

**Prisma types:**
```typescript
import { Account, Prisma } from '@prisma/client'

type AccountWithInstitution = Prisma.AccountGetPayload<{
  include: { institution: true }
}>
```

**Zod for runtime validation:**
```typescript
import { z } from 'zod'

const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['DEPOSIT', 'CREDIT_CARD', 'LOAN']),
  currency: z.string().length(3),
  balance: z.number()
})

type CreateAccountInput = z.infer<typeof createAccountSchema>
```

### 3. Progressive Enhancement

**Work without JavaScript:**
- Forms use native HTML forms with Server Actions
- Links use `<a>` tags (Next.js Link component)
- Critical features accessible without JS

**Enhance with JavaScript:**
- Optimistic updates
- Real-time validation
- Keyboard shortcuts

### 4. Data Fetching Patterns

**Parallel data fetching:**
```typescript
// ✅ Good: Parallel
async function DashboardPage() {
  const [accounts, netWorth, forecast] = await Promise.all([
    db.account.findMany(),
    getNetWorth(userId),
    getForecast(userId, 12)
  ])

  return <Dashboard {...} />
}
```

**Waterfall (avoid):**
```typescript
// ❌ Bad: Waterfall
async function DashboardPage() {
  const accounts = await db.account.findMany()
  const netWorth = await getNetWorth(userId) // Waits for accounts
  const forecast = await getForecast(userId, 12) // Waits for netWorth
}
```

### 5. Separation of Concerns

**Route Handler (thin):**
```typescript
// app/api/accounts/route.ts
export async function GET(req: Request) {
  const userId = auth().userId
  if (!userId) return unauthorized()

  // Delegate to service
  const accounts = await accountService.getAll(userId)

  return json(accounts)
}
```

**Service Layer (business logic):**
```typescript
// lib/services/account-service.ts
export const accountService = {
  async getAll(userId: string) {
    return db.account.findMany({
      where: { userId },
      include: { institution: true }
    })
  }
}
```

---

## Directory Structure

### Feature-Based Organization

```
app/
├── (auth)/                    # Auth-related pages
│   ├── sign-in/
│   └── sign-up/
├── (dashboard)/               # Protected routes
│   ├── layout.tsx            # Dashboard layout
│   ├── page.tsx              # Dashboard home
│   ├── accounts/
│   │   ├── page.tsx          # List
│   │   ├── [id]/
│   │   │   └── page.tsx      # Detail
│   │   └── _components/      # Feature components
│   │       ├── account-card.tsx
│   │       ├── account-form.tsx
│   │       └── account-filters.tsx
│   └── transactions/
│       └── ... (same pattern)
└── api/
    ├── accounts/
    │   ├── route.ts          # GET /api/accounts, POST /api/accounts
    │   └── [id]/
    │       └── route.ts      # GET/PATCH/DELETE /api/accounts/:id
    └── ...

components/
├── ui/                        # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── layout/                    # Layout components
│   ├── sidebar.tsx
│   ├── header.tsx
│   └── ...
└── shared/                    # Shared business components
    ├── currency-display.tsx
    ├── date-range-picker.tsx
    └── ...

lib/
├── prisma.ts                  # Prisma client
├── utils.ts                   # Shared utilities
├── validations.ts             # Zod schemas
├── services/                  # Business logic
│   ├── account-service.ts
│   ├── transaction-service.ts
│   └── ...
├── ai/
│   ├── gemini.ts
│   └── openai.ts
├── currency/
│   ├── fx-rates.ts
│   └── format.ts
└── forecast/
    ├── holt-winters.ts
    └── cash-flow.ts
```

### Naming Conventions

**Files:**
- Components: `kebab-case.tsx` (e.g., `account-card.tsx`)
- Routes: `page.tsx`, `layout.tsx`, `route.ts`
- Utilities: `kebab-case.ts` (e.g., `fx-rates.ts`)
- Types: `types.ts` or inline

**Components:**
- PascalCase (e.g., `AccountCard`, `DashboardLayout`)

**Functions:**
- camelCase (e.g., `getNetWorth`, `calculateForecast`)

**Constants:**
- UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `DEFAULT_CURRENCY`)

---

## Data Flow

### Read Flow (Server Component)

```
User Request
    ↓
Next.js Server Component
    ↓
Service Layer (lib/services/)
    ↓
Prisma Client
    ↓
PostgreSQL (Supabase)
    ↓
Data returned to component
    ↓
RSC payload sent to client
    ↓
Hydrated in browser
```

### Write Flow (Server Action)

```
User submits form
    ↓
Client Component calls Server Action
    ↓
Server Action validates with Zod
    ↓
Service Layer processes
    ↓
Prisma Client writes to DB
    ↓
Response returned
    ↓
Client revalidates (revalidatePath)
    ↓
UI updates
```

### Example: Create Transaction

```typescript
// app/(dashboard)/transactions/_components/transaction-form.tsx
'use client'

import { createTransaction } from '../actions'

export function TransactionForm() {
  async function handleSubmit(formData: FormData) {
    const result = await createTransaction(formData)
    if (result.success) {
      toast.success('Transaction created')
    }
  }

  return <form action={handleSubmit}>...</form>
}
```

```typescript
// app/(dashboard)/transactions/actions.ts
'use server'

import { revalidatePath } from 'next/cache'

export async function createTransaction(formData: FormData) {
  const userId = auth().userId
  if (!userId) throw new Error('Unauthorized')

  const data = createTransactionSchema.parse({
    accountId: formData.get('accountId'),
    amount: Number(formData.get('amount')),
    // ...
  })

  await db.transaction.create({ data: { ...data, userId } })

  revalidatePath('/transactions')

  return { success: true }
}
```

---

## Security

### Authentication

**Clerk Middleware:**
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)'
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)']
}
```

**Route Protection:**
```typescript
// app/api/accounts/route.ts
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const { userId } = auth()
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Proceed
}
```

### Authorization

**Row-Level Security (via Prisma):**
```typescript
// All queries automatically filtered by userId
const accounts = await db.account.findMany({
  where: { userId }
})

// Never trust client input for userId
// Always use auth().userId from Clerk
```

### Input Validation

**Always validate with Zod:**
```typescript
const input = createAccountSchema.parse(req.body)
```

**Sanitize user input:**
```typescript
import { sanitize } from 'isomorphic-dompurify'

const cleanDescription = sanitize(userInput)
```

### API Rate Limiting

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m')
})

// In API route
const { success } = await ratelimit.limit(userId)
if (!success) return new Response('Too many requests', { status: 429 })
```

### Secrets Management

**Never commit secrets:**
- Use `.env.local` for development
- Use Vercel Environment Variables for production
- Use `.env.example` as template (without values)

**Access secrets server-side only:**
```typescript
// ✅ Good: Server-side
const apiKey = process.env.GEMINI_API_KEY

// ❌ Bad: Client-side
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY // Exposed!
```

---

## Performance Optimization

### Database Optimization

**Indexes:**
```prisma
model Transaction {
  // ...

  @@index([accountId, postedAt])
  @@index([accountId, merchant])
  @@index([categoryId])
}
```

**Query optimization:**
```typescript
// ✅ Good: Select only needed fields
const transactions = await db.transaction.findMany({
  select: {
    id: true,
    amount: true,
    postedAt: true,
    account: {
      select: { name: true }
    }
  }
})

// ❌ Bad: Select all fields
const transactions = await db.transaction.findMany()
```

**Pagination:**
```typescript
const transactions = await db.transaction.findMany({
  take: 50,
  skip: page * 50,
  orderBy: { postedAt: 'desc' }
})
```

**Cursor-based pagination (better for large datasets):**
```typescript
const transactions = await db.transaction.findMany({
  take: 50,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { id: 'desc' }
})
```

### Caching Strategies

**Static Generation (when possible):**
```typescript
// app/page.tsx - Public landing page
export default function HomePage() {
  return <LandingPage />
}
// Automatically static
```

**Revalidation:**
```typescript
// Revalidate every hour
export const revalidate = 3600

export default async function DashboardPage() {
  // Data fetched and cached
}
```

**On-demand revalidation:**
```typescript
import { revalidatePath } from 'next/cache'

// After mutation
await db.transaction.create({ data })
revalidatePath('/transactions')
```

**Client-side caching (SWR or React Query):**
```typescript
'use client'

import useSWR from 'swr'

export function Transactions() {
  const { data, error, isLoading } = useSWR(
    '/api/transactions',
    fetcher,
    { revalidateOnFocus: false }
  )
}
```

### Code Splitting

**Dynamic imports:**
```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./heavy-chart'), {
  loading: () => <Skeleton />,
  ssr: false // Client-only
})
```

### Image Optimization

```typescript
import Image from 'next/image'

<Image
  src="/bank-logo.png"
  width={100}
  height={100}
  alt="Bank logo"
/>
```

### Bundle Analysis

```bash
npm install @next/bundle-analyzer

# In next.config.mjs
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true'
})

export default withBundleAnalyzer(nextConfig)

# Run
ANALYZE=true npm run build
```

---

## Error Handling

### API Error Response

```typescript
// lib/errors.ts
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

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}
```

**Error handler:**
```typescript
// lib/api-handler.ts
export function handleError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }

  if (error instanceof z.ZodError) {
    return Response.json(
      { error: 'Validation failed', issues: error.issues },
      { status: 400 }
    )
  }

  // Log unexpected errors
  console.error('Unexpected error:', error)

  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

**Usage:**
```typescript
export async function GET(req: Request) {
  try {
    const userId = auth().userId
    if (!userId) throw new AppError('Unauthorized', 401)

    const accounts = await accountService.getAll(userId)

    return Response.json(accounts)
  } catch (error) {
    return handleError(error)
  }
}
```

### Error Boundaries (Client)

```typescript
// app/error.tsx
'use client'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Global Error Page

```typescript
// app/global-error.tsx
'use client'

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  )
}
```

---

## Code Standards

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowJs": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_" }
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 80
}
```

### Code Comments

**Do:**
```typescript
// Calculate total interest paid across all cards in the last 12 months
async function getTotalInterest(userId: string): Promise<number> {
  // ...
}
```

**Don't:**
```typescript
// Get total interest
async function getTotalInterest(userId: string): Promise<number> {
  // ...
}
```

**Complex logic:**
```typescript
// Holt-Winters triple exponential smoothing
// Uses additive model: Y[t] = L[t] + T[t] + S[t]
// Where:
//   L[t] = level (α smoothing)
//   T[t] = trend (β smoothing)
//   S[t] = seasonal (γ smoothing)
function holtWinters(data: number[], alpha: number, beta: number, gamma: number) {
  // ...
}
```

---

## API Design Patterns

### RESTful Conventions

```
GET    /api/accounts          → List all
POST   /api/accounts          → Create one
GET    /api/accounts/:id      → Get one
PATCH  /api/accounts/:id      → Update one
DELETE /api/accounts/:id      → Delete one

GET    /api/accounts/:id/transactions → Nested resource
```

### Request/Response Format

**Request (POST/PATCH):**
```json
{
  "name": "Main Checking",
  "type": "DEPOSIT",
  "currency": "USD",
  "balance": 1000.00
}
```

**Response (success):**
```json
{
  "id": "abc123",
  "name": "Main Checking",
  "type": "DEPOSIT",
  "currency": "USD",
  "balance": "1000.00",
  "createdAt": "2025-11-17T10:00:00Z"
}
```

**Response (error):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "issues": [
    {
      "path": ["balance"],
      "message": "Balance must be a number"
    }
  ]
}
```

### Versioning

**URL versioning (if needed):**
```
/api/v1/accounts
/api/v2/accounts
```

**Header versioning:**
```
Accept: application/vnd.api+json; version=1
```

For this project: Start with v1, add versioning only when breaking changes are needed.

---

## State Management

### Server State

**Use Server Components by default:**
```typescript
// No client-side state needed
async function AccountsPage() {
  const accounts = await db.account.findMany()
  return <AccountList accounts={accounts} />
}
```

**Mutations via Server Actions:**
```typescript
'use server'

export async function deleteAccount(id: string) {
  await db.account.delete({ where: { id } })
  revalidatePath('/accounts')
}
```

### Client State

**Local state (useState):**
```typescript
'use client'

export function AccountFilters() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<AccountType | null>(null)

  // Filter logic
}
```

**Global client state (if needed):**
- Small app: Context API
- Large app: Zustand or Jotai

**Example (Zustand):**
```typescript
// lib/stores/use-currency-store.ts
import { create } from 'zustand'

interface CurrencyStore {
  baseCurrency: string
  setBaseCurrency: (currency: string) => void
}

export const useCurrencyStore = create<CurrencyStore>((set) => ({
  baseCurrency: 'USD',
  setBaseCurrency: (currency) => set({ baseCurrency: currency })
}))
```

### Form State

**Use React Hook Form:**
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

export function AccountForm() {
  const form = useForm({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: '',
      type: 'DEPOSIT',
      balance: 0
    }
  })

  async function onSubmit(data: CreateAccountInput) {
    await createAccount(data)
  }

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
}
```

---

## Testing Patterns

### Unit Tests

**Test utilities:**
```typescript
// lib/currency/fx-rates.test.ts
import { describe, it, expect } from 'vitest'
import { convert } from './fx-rates'

describe('convert', () => {
  it('converts USD to TRY correctly', () => {
    const result = convert(100, 'USD', 'TRY', mockRate)
    expect(result).toBe(3200)
  })

  it('returns same amount for same currency', () => {
    const result = convert(100, 'USD', 'USD')
    expect(result).toBe(100)
  })
})
```

**Test components:**
```typescript
// components/ui/button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)

    await userEvent.click(screen.getByText('Click me'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
```

### Integration Tests

**Test API routes:**
```typescript
// tests/integration/api/accounts.test.ts
import { POST, GET } from '@/app/api/accounts/route'

describe('POST /api/accounts', () => {
  it('creates an account', async () => {
    const req = new Request('http://localhost/api/accounts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Account',
        type: 'DEPOSIT',
        currency: 'USD',
        balance: 1000
      })
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.name).toBe('Test Account')
  })
})
```

### E2E Tests

**Test user flows:**
```typescript
// tests/e2e/transactions.spec.ts
import { test, expect } from '@playwright/test'

test('user can create a transaction', async ({ page }) => {
  // Sign in
  await page.goto('/sign-in')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password')
  await page.click('button[type="submit"]')

  // Go to transactions
  await page.goto('/transactions')

  // Click "New Transaction"
  await page.click('button:has-text("New Transaction")')

  // Fill form
  await page.selectOption('select[name="accountId"]', 'account-1')
  await page.fill('input[name="amount"]', '100')
  await page.fill('input[name="description"]', 'Groceries')

  // Submit
  await page.click('button[type="submit"]')

  // Verify
  await expect(page.locator('text=Groceries')).toBeVisible()
})
```

---

## Deployment Architecture

### Vercel Deployment

**Environment:**
- **Platform:** Vercel Serverless
- **Region:** Auto (Edge network)
- **Node Version:** 18.x or 20.x

**Build Configuration:**
```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && prisma migrate deploy && next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

**Vercel Configuration:**
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/snapshot",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/fx-rates",
      "schedule": "0 1 * * *"
    }
  ]
}
```

### Database Migrations

**Development:**
```bash
npx prisma migrate dev --name add_installments
```

**Production:**
```bash
# Runs automatically in build
npx prisma migrate deploy
```

### Environment Variables

**Required:**
- `DATABASE_URL` - Supabase connection string
- `DIRECT_URL` - Direct connection (for migrations)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret
- `GOOGLE_GEMINI_API_KEY` - Gemini API
- `OPENAI_API_KEY` - OpenAI API
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `CRON_SECRET` - For cron job protection

### Monitoring

**Vercel Analytics:**
- Automatically enabled
- Web Vitals tracking

**Sentry:**
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV
})
```

**Logs:**
- Use `console.error` for errors (sent to Vercel)
- Structure logs with context:
```typescript
console.error('Failed to create transaction', {
  userId,
  error: error.message,
  timestamp: new Date().toISOString()
})
```

---

## Best Practices Summary

### Do's

✅ Use TypeScript strict mode
✅ Validate all inputs with Zod
✅ Default to Server Components
✅ Use Server Actions for mutations
✅ Add database indexes
✅ Implement error boundaries
✅ Use semantic HTML
✅ Write tests for critical paths
✅ Keep API routes thin
✅ Use descriptive variable names
✅ Add JSDoc comments for complex functions
✅ Optimize images with Next/Image
✅ Implement proper error handling
✅ Use environment variables for secrets

### Don'ts

❌ Don't expose secrets to client
❌ Don't trust client input
❌ Don't use `any` type
❌ Don't skip validation
❌ Don't ignore TypeScript errors
❌ Don't fetch data in loops (N+1)
❌ Don't commit `.env` files
❌ Don't hardcode URLs or config
❌ Don't skip error handling
❌ Don't use inline styles (use Tailwind)
❌ Don't mutate props
❌ Don't use index as key in lists

---

**End of Architecture Document**
