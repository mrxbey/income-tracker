# Income Tracker - Best Practices Guide

**Last Updated:** 2025-11-17
**Framework:** Next.js 15.5.6, React 19, TypeScript 5.x

---

## Table of Contents

1. [Next.js 15 Best Practices](#nextjs-15-best-practices)
2. [React 19 Patterns](#react-19-patterns)
3. [TypeScript Guidelines](#typescript-guidelines)
4. [Database & Prisma](#database--prisma)
5. [API Routes](#api-routes)
6. [Security](#security)
7. [Performance](#performance)
8. [Testing](#testing)
9. [Code Quality](#code-quality)

---

## Next.js 15 Best Practices

### 1. Async Request APIs

**✅ ALWAYS await params, searchParams, cookies, and headers**

```typescript
// ❌ WRONG (Next.js 14 pattern)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const account = await getAccount(params.id) // params not awaited
}

// ✅ CORRECT (Next.js 15 pattern)
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params // Await params
  const account = await getAccount(params.id)
}
```

**Migration:** Run `npx @next/codemod@canary next-async-request-api .` to auto-fix.

### 2. Caching Strategy

**Default:** GET route handlers are NOT cached by default in Next.js 15.

```typescript
// Opt-in to caching
export const revalidate = 60 // Revalidate every 60 seconds

// Or use Response cache headers
return Response.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
  }
})

// For Server Components
import { unstable_cache } from 'next/cache'

const getCachedData = unstable_cache(
  async (userId) => getData(userId),
  ['data-key'],
  { revalidate: 60, tags: ['data'] }
)
```

### 3. Loading States

**✅ ALWAYS add loading.tsx for route segments**

```typescript
// app/(dashboard)/loading.tsx
export default function Loading() {
  return <SkeletonUI />
}
```

### 4. Error Boundaries

**✅ ALWAYS add error.tsx for route segments**

```typescript
// app/(dashboard)/error.tsx
'use client'

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### 5. Server Components by Default

**✅ Use Server Components as default, opt-in to Client Components**

```typescript
// ✅ Server Component (default - no directive needed)
export default async function Page() {
  const data = await fetchData()
  return <div>{data}</div>
}

// ✅ Client Component (when needed)
'use client'
export default function InteractiveForm() {
  const [state, setState] = useState()
  return <form>...</form>
}
```

---

## React 19 Patterns

### 1. The `use()` Hook

**Use for suspending resources in components**

```typescript
import { use } from 'react'

// ✅ Suspend until promise resolves
export default function UserProfile({ userPromise }) {
  const user = use(userPromise)
  return <div>{user.name}</div>
}
```

### 2. Form Actions

**Use Server Actions for form handling**

```typescript
// app/actions/transaction.ts
'use server'

export async function createTransaction(formData: FormData) {
  const { userId } = await auth()
  const data = {
    amount: formData.get('amount'),
    description: formData.get('description'),
  }
  return await transactionService.create(userId, data)
}

// In component
<form action={createTransaction}>
  <input name="amount" />
  <input name="description" />
  <button type="submit">Create</button>
</form>
```

### 3. Optimistic UI with `useOptimistic`

```typescript
'use client'
import { useOptimistic } from 'react'

function TransactionList({ transactions }) {
  const [optimisticTransactions, addOptimistic] = useOptimistic(
    transactions,
    (state, newTxn) => [...state, newTxn]
  )

  async function handleAdd(txn) {
    addOptimistic(txn) // Instant UI update
    await createTransaction(txn) // Actual API call
  }

  return <div>{optimisticTransactions.map(...)}</div>
}
```

### 4. Form Status with `useFormStatus`

```typescript
'use client'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Transaction'}
    </button>
  )
}
```

---

## TypeScript Guidelines

### 1. Strict Mode Always

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 2. Type Inference Over Explicit Types

```typescript
// ❌ Over-specified
const user: User = await db.user.findUnique({ where: { id } }) as User

// ✅ Let TypeScript infer
const user = await db.user.findUnique({ where: { id } })
```

### 3. Utility Types for Props

```typescript
// ✅ Use Pick, Omit, Partial for component props
interface TransactionCardProps {
  transaction: Pick<Transaction, 'id' | 'amount' | 'description' | 'postedAt'>
}

// ✅ Infer types from functions
type CreateTransactionInput = Parameters<typeof transactionService.create>[1]
```

### 4. No `any` Types

```typescript
// ❌ Never use any
function handleData(data: any) { }

// ✅ Use unknown and type guards
function handleData(data: unknown) {
  if (isTransaction(data)) {
    // TypeScript knows data is Transaction here
  }
}
```

---

## Database & Prisma

### 1. Always Use Indexes

**✅ Add indexes for frequently queried fields**

```prisma
model Transaction {
  @@index([accountId, postedAt])        // Range queries
  @@index([accountId, type, reviewStatus]) // Multi-field filters
  @@index([merchant])                    // Search queries
}
```

### 2. Selective Field Inclusion

```typescript
// ❌ Fetches ALL fields
const accounts = await db.account.findMany({
  include: { transactions: true }
})

// ✅ Only fetch what you need
const accounts = await db.account.findMany({
  include: {
    transactions: {
      select: {
        id: true,
        amount: true,
        postedAt: true,
      },
      take: 10,
    }
  }
})
```

### 3. Transaction Handling

**✅ Use transactions for multi-step operations**

```typescript
await db.$transaction(async (tx) => {
  // Create transaction
  const transaction = await tx.transaction.create({ data })

  // Update account balance
  await tx.account.update({
    where: { id: accountId },
    data: { balance: { increment: amount } }
  })
})
```

### 4. Cascading Deletes

**✅ Configure proper cascade in schema**

```prisma
model Account {
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  transactions Transaction[]  // Auto-deletes with onDelete: Cascade
}
```

---

## API Routes

### 1. Authentication First

**✅ ALWAYS check auth before any logic**

```typescript
export async function POST(req: NextRequest) {
  // ✅ Check auth first
  const { userId } = await auth()
  if (!userId) {
    throw new UnauthorizedError()
  }

  // Then proceed with business logic
  const body = await req.json()
  // ...
}
```

### 2. Input Validation with Zod

**✅ ALWAYS validate input**

```typescript
import { z } from 'zod'

const createTransactionSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  accountId: z.string().cuid(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = createTransactionSchema.parse(body) // Throws on invalid
  // ...
}
```

### 3. Consistent Error Handling

**✅ Use centralized error handler**

```typescript
import { handleError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    // ... logic
    return Response.json({ success: true })
  } catch (error) {
    return handleError(error) // Returns proper status codes
  }
}
```

### 4. Response Formatting

**✅ Consistent response structure**

```typescript
// ✅ Success response
return Response.json({
  data: transaction,
  meta: { timestamp: new Date() }
}, { status: 201 })

// ✅ Error response (via handleError)
return Response.json({
  error: { message: 'Not found', code: 'NOT_FOUND' }
}, { status: 404 })
```

---

## Security

### 1. Never Trust User Input

**✅ Sanitize all user input**

```typescript
import DOMPurify from 'isomorphic-dompurify'

async function create(data: CreateInput) {
  const sanitized = {
    ...data,
    description: DOMPurify.sanitize(data.description),
    merchant: data.merchant ? DOMPurify.sanitize(data.merchant) : null,
  }
  return await db.transaction.create({ data: sanitized })
}
```

### 2. User Data Isolation

**✅ ALWAYS filter by userId**

```typescript
// ✅ Scope all queries to current user
const transactions = await db.transaction.findMany({
  where: {
    account: {
      userId, // ← CRITICAL: User isolation
    },
  },
})
```

### 3. Rate Limiting

**✅ Add rate limiting to public endpoints**

```typescript
import { Ratelimit } from "@upstash/ratelimit"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
})

export async function POST(req: NextRequest) {
  const ip = req.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }
  // ... rest of handler
}
```

### 4. Environment Variable Validation

**✅ Validate env vars at startup**

```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  // ... all other env vars
})

export const env = envSchema.parse(process.env)
```

---

## Performance

### 1. Parallel Data Fetching

**✅ Use Promise.all for independent queries**

```typescript
// ✅ Parallel (fast)
const [accounts, categories, tags] = await Promise.all([
  accountService.getAll(userId),
  categoryService.getAll(userId),
  tagService.getAll(userId),
])

// ❌ Sequential (slow)
const accounts = await accountService.getAll(userId)
const categories = await categoryService.getAll(userId)
const tags = await tagService.getAll(userId)
```

### 2. Dynamic Imports

**✅ Code split large components**

```typescript
import dynamic from 'next/dynamic'

const ChartComponent = dynamic(() => import('@/components/charts/NetWorthChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Client-only if needed
})
```

### 3. Image Optimization

**✅ Use next/image for all images**

```typescript
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={100}
  height={100}
  priority // For above-fold images
/>
```

### 4. Streaming with Suspense

**✅ Stream slow components**

```typescript
import { Suspense } from 'react'

export default function Page() {
  return (
    <>
      <Header /> {/* Fast - renders immediately */}
      <Suspense fallback={<Skeleton />}>
        <SlowComponent /> {/* Slow - streams when ready */}
      </Suspense>
    </>
  )
}
```

---

## Testing

### 1. Unit Tests for Services

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { transactionService } from '@/lib/services/transaction-service'

describe('TransactionService', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  it('should create transaction and update balance', async () => {
    const txn = await transactionService.create(userId, data)
    expect(txn.amount).toBe(data.amount)

    const account = await db.account.findUnique({ where: { id: accountId } })
    expect(account.balance).toBe(expectedBalance)
  })
})
```

### 2. Integration Tests for API Routes

```typescript
import { describe, it, expect } from 'vitest'

describe('POST /api/transactions', () => {
  it('should create transaction', async () => {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(validData),
    })

    expect(response.status).toBe(201)
    const { transaction } = await response.json()
    expect(transaction.amount).toBe(validData.amount)
  })

  it('should reject unauthenticated requests', async () => {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(validData),
    })

    expect(response.status).toBe(401)
  })
})
```

### 3. E2E Tests with Playwright

```typescript
import { test, expect } from '@playwright/test'

test('user can create transaction', async ({ page }) => {
  await page.goto('/transactions')
  await page.click('[data-testid="create-transaction"]')

  await page.fill('[name="amount"]', '100')
  await page.fill('[name="description"]', 'Test transaction')
  await page.click('[type="submit"]')

  await expect(page.locator('text=Transaction created')).toBeVisible()
})
```

---

## Code Quality

### 1. Component Organization

```
components/
├── ui/              # Reusable UI primitives
│   ├── button.tsx
│   └── card.tsx
├── features/        # Feature-specific components
│   ├── transactions/
│   │   ├── TransactionList.tsx
│   │   └── TransactionForm.tsx
└── layout/          # Layout components
    ├── Header.tsx
    └── Sidebar.tsx
```

### 2. File Naming

- **Components:** PascalCase (`TransactionCard.tsx`)
- **Utilities:** camelCase (`formatCurrency.ts`)
- **Services:** kebab-case (`transaction-service.ts`)
- **Types:** PascalCase (`Transaction.ts`)

### 3. Import Order

```typescript
// 1. External libraries
import { useState } from 'react'
import { z } from 'zod'

// 2. Internal absolute imports
import { Button } from '@/components/ui/button'
import { transactionService } from '@/lib/services/transaction-service'

// 3. Relative imports
import { formatCurrency } from './utils'

// 4. Types
import type { Transaction } from '@prisma/client'
```

### 4. Code Comments

```typescript
// ✅ Good: Explain WHY, not WHAT
// Normalize merchant names to improve duplicate detection
const normalized = merchant.toLowerCase().trim()

// ❌ Bad: States the obvious
// Set the name to merchant
const name = merchant
```

---

## Checklist for New Features

- [ ] TypeScript: No `any` types, strict mode passing
- [ ] API Route: Auth check, input validation, error handling
- [ ] Database: Indexes for new queries, proper relations
- [ ] Security: User data isolation, input sanitization
- [ ] UX: Loading states, error boundaries
- [ ] Performance: Caching strategy, parallel fetching
- [ ] Tests: Unit tests for services, integration for APIs
- [ ] Documentation: Update relevant docs

---

## Quick References

### Next.js 15 Breaking Changes
- [Official Blog Post](https://nextjs.org/blog/next-15)
- Run codemod: `npx @next/codemod@canary next-async-request-api .`

### React 19 New Features
- [Official Documentation](https://react.dev/blog/2024/12/05/react-19)
- `use()` hook, `useOptimistic`, `useFormStatus`

### Prisma Best Practices
- [Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Query Optimization](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)

---

**Questions?** Refer to the [AUDIT_REPORT.md](./AUDIT_REPORT.md) for detailed analysis of current implementation.
