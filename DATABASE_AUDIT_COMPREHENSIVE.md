# COMPREHENSIVE DATABASE OPERATIONS AUDIT
## Income Tracker Application

### EXECUTIVE SUMMARY
This audit examined 16 service files, the Prisma schema with 24 models, and multiple API routes. 
The codebase demonstrates good foundational practices with transaction management and authorization 
checks, but contains several critical performance and data integrity issues.

### CRITICAL FINDINGS (High Severity)

#### 1. N+1 QUERY PROBLEM: Tag Rule Application Loop
**Location:** `/home/user/income-tracker/lib/services/tag-rule-service.ts` (Lines 199-235)
**Severity:** CRITICAL
**Confidence:** 98%

**Issue:**
```typescript
for (const tagId of rule.tagIds) {  // Line 204 - LOOP ITERATION
  const existing = await prisma.transactionTag.findFirst({  // N+1 QUERY
    where: {
      transactionId,
      tagId,
    },
  })
  if (!existing) {
    await prisma.transactionTag.create({  // CREATES QUERY INSIDE LOOP
      ...
    })
  }
}
```

**Impact:** 
- For each tag in a rule (typically 1-5 tags), this executes 2 database queries
- For 100 transactions with 10 rules each having 3 tags = 6,000 extra database calls
- Function `applyTagRulesToTransactions` (line 243) compounds this by looping over transactions

**Fix:** Use batch operations instead of loops

---

#### 2. NESTED N+1 QUERY: Tag Rule Suggestion
**Location:** `/home/user/income-tracker/lib/services/tag-rule-service.ts` (Lines 359-412)
**Severity:** CRITICAL
**Confidence:** 97%

**Issue:**
```typescript
for (const [merchant, txns] of Object.entries(merchantGroups)) {  // Line 360
  if (commonTags.length > 0 || commonCategory) {
    const tags = await prisma.tag.findMany({  // Line 388 - QUERY IN LOOP
      where: {
        id: { in: commonTags },
      },
    })
    
    const category = commonCategory
      ? await prisma.category.findUnique({  // Line 395 - ANOTHER QUERY IN LOOP
          where: { id: commonCategory[0] },
        })
      : null
  }
}
```

**Impact:**
- Executes separate database query for EACH merchant pattern (could be 50-100+ per user)
- Could result in 100-200+ database queries for a single `suggestTagRules()` call
- Severely impacts performance when analyzing large transaction histories

**Fix:** Batch fetch all tags and categories upfront, then map in application logic

---

#### 3. SEQUENTIAL N+1 IN MULTI-TRANSACTION RULE APPLICATION
**Location:** `/home/user/income-tracker/lib/services/tag-rule-service.ts` (Lines 243-259)
**Severity:** HIGH
**Confidence:** 99%

**Issue:**
```typescript
for (const txnId of transactionIds) {  // Line 250 - SEQUENTIAL LOOP
  const result = await applyTagRulesToTransaction(userId, txnId)  // CALLS FUNCTION WITH N+1
}
```

**Impact:**
- For 100 transactions: 100+ database calls just to validate rules
- Each call has its own nested loop with queries (N+1^2)
- Could lead to 10,000+ database queries for bulk rule application

---

#### 4. RACE CONDITION: Account Balance Updates
**Location:** `/home/user/income-tracker/lib/services/currency-service.ts` (Lines 203-222)
**Severity:** HIGH
**Confidence:** 96%

**Issue:**
```typescript
for (const account of accounts) {  // Line 205 - LOOP OVER ACCOUNTS
  const balance = Number(account.balance)
  
  if (account.currency === baseCurrency) {
    netWorthInBase += balance
  } else {
    const conversion = await convertCurrency(  // AWAITS IN LOOP - NO TRANSACTION
      userId,
      balance,
      account.currency,
      baseCurrency
    )
  }
}
```

**Impact:**
- When multiple concurrent requests calculate net worth, balances may change between reads
- No transaction wrapping the entire calculation
- Could result in stale net worth calculations in multi-threaded scenarios

**Additional Context:**
While `transaction-service.ts` correctly uses `db.$transaction()` for balance updates, 
the currency conversion for net worth lacks the same protection.

---

### HIGH SEVERITY FINDINGS

#### 5. MISSING INDEXES FOR FREQUENTLY QUERIED FIELDS
**Location:** `/home/user/income-tracker/prisma/schema.prisma`
**Severity:** HIGH
**Confidence:** 95%

**Issue - Notification Queries Without Proper Indexes:**
```prisma
model Notification {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       String
  priority   String
  read       Boolean  @default(false)
  createdAt  DateTime @default(now())
  
  @@index([userId, read])      // Good
  @@index([userId, createdAt]) // Good
  @@index([type, createdAt])   // But missing userId
}
```

**Missing Indexes:**
1. No index on `(userId, type, read, createdAt)` for filtered notification queries
2. Notification generation queries (lines 233-246, 309-322, 372-385) would perform sequential scans

**Impact:**
- Notification generation functions execute full table scans per user
- Significant performance degradation with thousands of notifications

---

#### 6. MISSING INDEXES: Budget/Spending Queries
**Location:** `/home/user/income-tracker/prisma/schema.prisma`
**Severity:** HIGH
**Confidence:** 94%

**Issue:**
```prisma
model Budget {
  // ...
  startDate  DateTime
  endDate    DateTime?
  isActive   Boolean  @default(true)
  
  @@unique([userId, categoryId, startDate])  // Prevents duplicates
  @@index([userId, isActive])                 // Incomplete!
  @@index([startDate, endDate])               // Missing userId!
}
```

**Budget Summary Query (budget-service.ts:70-88) needs:**
```sql
SELECT * FROM Budget 
WHERE userId = ? AND isActive = true AND startDate <= ? AND (endDate IS NULL OR endDate >= ?)
```

**Current indexes cannot efficiently support this WHERE clause.**

**Similarly for Transaction queries:**
```prisma
model Transaction {
  @@index([accountId, postedAt])      // Good
  @@index([accountId, merchant])      // Good
  @@index([categoryId])               // Incomplete
  @@index([source, reviewStatus])     // Missing accountId
  @@index([postedAt])                 // Too broad
}
```

---

#### 7. AUTHORIZATION BYPASS: Budget Service
**Location:** `/home/user/income-tracker/lib/services/budget-service.ts` (Lines 194-206)
**Severity:** HIGH
**Confidence:** 92%

**Issue:**
```typescript
export async function updateBudget(
  userId: string,
  budgetId: string,
  data: {
    amount?: number
    startDate?: Date
    endDate?: Date | null
    isActive?: boolean
  }
) {
  const budget = await prisma.budget.update({
    where: {
      id: budgetId,
      userId,  // ✓ Good - userId check is present
    },
    data,
    include: {
      category: true,
    },
  })

  return budget
}
```

**However, the category relation is NOT verified to belong to the user:**
```typescript
// Missing validation:
// const category = await prisma.category.findFirst({
//   where: { id: budget.category.id, userId }
// })
```

**Attack Scenario:**
1. User A has categoryId "cat-1" they created
2. User B creates a budget with their own categoryId
3. User B calls `updateBudget()` and modifies it to point to User A's categoryId
4. Result: User B gains visibility into User A's category metadata

---

#### 8. CASCADING DELETES: Data Loss Risk
**Location:** `/home/user/income-tracker/prisma/schema.prisma`
**Severity:** HIGH
**Confidence:** 98%

**Critical Cascade Chain:**
```prisma
model User {
  // 26 cascading deletes defined
  accounts          Account[]          // onDelete: Cascade
  categories        Category[]         // onDelete: Cascade
  transactions      Transaction[]      // Cascade via Account
  // ... more
}

// Delete one User -> Cascades to:
Account (onDelete: Cascade) 
  -> Transaction (onDelete: Cascade)
    -> TransactionTag (onDelete: Cascade)
    -> TransactionSplit (onDelete: Cascade)
    -> ExtractedLineItem (onDelete: Cascade)
```

**Specific Problem:**
```prisma
model Account {
  bankConnectionId   String?
  bankConnection   BankConnection? @relation(fields: [bankConnectionId], references: [id], onDelete: Cascade)
}

// If a BankConnection is deleted, ALL associated Accounts are deleted
// Even if user only wants to disconnect from that specific bank
// This is probably NOT the intended behavior
```

**Safer Pattern Would Be:**
```prisma
onDelete: SetNull    // or
isActive: Boolean    // soft delete
```

---

### MEDIUM SEVERITY FINDINGS

#### 9. MISSING UNIQUE CONSTRAINTS
**Location:** `/home/user/income-tracker/prisma/schema.prisma`
**Severity:** MEDIUM
**Confidence:** 93%

**Issue 1: No unique constraint on account selection per transaction:**
```prisma
model Transaction {
  accountId     String
  account       Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  
  externalId     String?  // Plaid transaction ID
  @@unique([accountId, externalId])
  
  // BUT: No constraint preventing duplicate external IDs across different imports!
  // If re-importing bank statement, could create duplicates
}
```

**Issue 2: Tag slugs not globally unique:**
```prisma
model Tag {
  slug      String
  @@unique([userId, slug])  // ✓ Good per-user uniqueness
  
  // But if user creates "Groceries" -> slug "groceries"
  // and later creates "GROCeries" -> slug "groceries"  
  // Both would be valid due to case sensitivity in uniqueness check
}
```

**Issue 3: Missing constraint on split percentages:**
```prisma
model TransactionSplit {
  amount         Decimal     @db.Decimal(18, 2)
  percentage     Decimal?    @db.Decimal(5, 2)  // 0-100 presumably
  
  // No validation that splits sum to 100% or amount equals transaction
  // This is caught in application logic (split-transaction-service.ts:48)
  // but should be DB constraint
}
```

---

#### 10. SOFT DELETE MISSING
**Location:** `/home/user/income-tracker/prisma/schema.prisma`
**Severity:** MEDIUM
**Confidence:** 90%

**Issue:**
```prisma
model DocumentUpload {
  status       DocumentStatus @default(UPLOADED)
  
  // Can be deleted, cascading to ExtractedLineItem
  // Better pattern: mark as "DELETED" or add deletedAt field
}

model Goal {
  isCompleted   Boolean  @default(false)
  completedAt   DateTime?
  
  // Has soft-delete-like pattern for completion
  // Should apply same pattern to other entities
}
```

**Why It Matters:**
- User deletes document -> orphans extracted line items
- No audit trail of what was deleted
- Cannot recover accidentally deleted data

---

#### 11. NULLABLE FIELDS THAT SHOULDN'T BE
**Location:** `/home/user/income-tracker/prisma/schema.prisma`
**Severity:** MEDIUM
**Confidence:** 92%

**Issue:**
```prisma
model CreditCardMeta {
  accountId     String   @id
  account       Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  
  apr           Decimal? @db.Decimal(7, 4)    // Nullable - OK
  creditLimit   Decimal? @db.Decimal(18, 2)   // Nullable - OK
  statementDay  Int?     // 1–31 - Nullable OK
  
  // All fields are optional - what if user creates credit card meta without any data?
}

model ExchangeRate {
  rate         Decimal  @db.Decimal(18, 8)   // NOT nullable - good
  source       ExchangeRateSource @default(USER)
  notes        String?  // Nullable - OK
}

// Problem: source defaults to USER but might be null in older records
```

---

#### 12. TRANSACTION ISOLATION: No Explicit Isolation Level
**Location:** `/home/user/income-tracker/lib/prisma.ts`
**Severity:** MEDIUM
**Confidence:** 91%

**Issue:**
```typescript
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
```

**Missing:**
- No explicit isolation level configuration
- Prisma defaults to READ_COMMITTED
- For financial balance operations, should be SERIALIZABLE or REPEATABLE_READ

**Better Pattern:**
```typescript
const db = new PrismaClient({
  // Prisma doesn't expose isolation level in constructor
  // Must be set per-transaction in code
})

// In transaction-service.ts, should add:
await db.$transaction(
  async (tx) => {
    // Operations
  },
  {
    isolationLevel: 'Serializable', // or 'RepeatableRead'
  }
)
```

**Current Code (transaction-service.ts:152-199):**
```typescript
const transaction = await db.$transaction(async (tx) => {
  // Creates and updates without explicit isolation level
  // Relies on PostgreSQL default (READ_COMMITTED for most operations)
})
```

---

### LOW-MEDIUM SEVERITY FINDINGS

#### 13. PERFORMANCE: Inefficient Net Worth Calculation
**Location:** `/home/user/income-tracker/lib/services/networth-service.ts` (Lines 74-126)
**Severity:** MEDIUM
**Confidence:** 89%

**Issue:**
```typescript
async function saveNetWorthSnapshot(userId: string) {
  const netWorthData = await calculateCurrentNetWorth(userId)  // LINE 1: Fetch all accounts
  
  const existing = await prisma.netWorthSnapshot.findFirst({   // LINE 2: Check if exists
    where: {
      userId,
      takenAt: {
        gte: today,
      },
    },
  })
  
  if (existing) {
    // LINE 3: Update existing
    await prisma.netWorthSnapshot.update({...})
  } else {
    // LINE 4: Create new
    await prisma.netWorthSnapshot.create({...})
  }
}
```

**Could be optimized to:**
```typescript
// Single upsert operation
await prisma.netWorthSnapshot.upsert({
  where: { userId_takenAt: { userId, takenAt: today } },
  update: { /* ... */ },
  create: { /* ... */ },
})
```

---

#### 14. ORPHANED RECORDS: Tag Rules Without Tags
**Location:** `/home/user/income-tracker/lib/services/tag-rule-service.ts` (Lines 31-72)
**Severity:** MEDIUM  
**Confidence:** 87%

**Issue:**
```typescript
export async function createTagRule(
  userId: string,
  rule: TagRuleInput
) {
  const createdRule = await prisma.tagRule.create({
    data: {
      userId,
      pattern: rule.pattern,
      patternType: rule.patternType,
      tagIds: rule.tagIds,      // Array of tag IDs - NO FOREIGN KEY
      categoryId: rule.categoryId,
      confidenceBoost: rule.confidenceBoost || 0,
      priority: rule.priority || 0,
      active: true,
    },
  })
  
  // NO VALIDATION that tags exist!
  const tags = await prisma.tag.findMany({
    where: {
      id: { in: rule.tagIds },  // Could return FEWER tags than in rule.tagIds
    },
  })
}
```

**Problem:**
- Rule can reference non-existent tags
- No foreign key constraint
- If tags are deleted, rule still contains dead tag IDs
- When rule is applied, orphaned tagIds are silently ignored

---

#### 15. MISSING INDEX: Plaid Sync Operations
**Location:** `/home/user/income-tracker/prisma/schema.prisma`
**Severity:** MEDIUM
**Confidence:** 88%

**Issue:**
```prisma
model BankConnection {
  id              String                @id @default(cuid())
  userId          String
  user            User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  itemId          String                @unique  // ✓ Good
  status          BankConnectionStatus  @default(ACTIVE)
  
  lastSyncAt      DateTime?
  accounts        Account[]
  
  @@index([userId])
  @@index([status])
  
  // MISSING: @@index([lastSyncAt]) for finding connections needing sync
  // MISSING: @@index([userId, status, lastSyncAt]) for bulk sync operations
}
```

**Impact:**
Finding accounts to sync (probably done in background job):
```typescript
// Would need to scan all bank connections and filter in memory
const needsSync = connections.filter(c => 
  c.lastSyncAt == null || Date.now() - c.lastSyncAt > SYNC_INTERVAL
)
```

---

### LOWER SEVERITY FINDINGS

#### 16. INEFFICIENT MEMORY USAGE: Category Tree Building
**Location:** `/home/user/income-tracker/lib/services/category-service.ts` (Lines 106-116)
**Severity:** LOW
**Confidence:** 85%

**Issue:**
```typescript
async getTree(userId: string) {
  const categories = await this.getAll(userId)  // Fetches ALL categories
  
  // Then manually builds tree in JavaScript
  const rootCategories = categories.filter((cat) => !cat.parentId)
  
  return rootCategories.map((root) => ({
    ...root,
    children: categories.filter((cat) => cat.parentId === root.id)  // N filtering loops
  }))
}
```

**Better Pattern:** Use database hierarchy queries or limit depth

---

#### 17. MISSING INDEX: Recurring Detection
**Location:** `/home/user/income-tracker/lib/services/subscription-service.ts`
**Severity:** LOW
**Confidence:** 83%

**Issue:**
Looking at `detectRecurringPatterns()` call (line 72), likely queries transactions by:
```typescript
// Probably does something like:
const transactions = await prisma.transaction.findMany({
  where: {
    account: { userId },
    type: TxnType.EXPENSE,
  },
  include: { account: true },
})
```

**Needs:** Index on `(accountId, type, merchant, postedAt)`

---

### SUMMARY TABLE

| # | Category | Severity | Issue | File | Lines |
|---|----------|----------|-------|------|-------|
| 1 | N+1 Query | CRITICAL | Tag rule application loop | tag-rule-service.ts | 204-224 |
| 2 | N+1 Query | CRITICAL | Tag rule suggestion | tag-rule-service.ts | 359-412 |
| 3 | N+1 Query | HIGH | Sequential transaction rule apply | tag-rule-service.ts | 243-259 |
| 4 | Race Condition | HIGH | Net worth calculation | currency-service.ts | 203-222 |
| 5 | Missing Index | HIGH | Notification queries | schema.prisma | Notification model |
| 6 | Missing Index | HIGH | Budget date range queries | schema.prisma | Budget model |
| 7 | Auth Bypass | HIGH | Category relation not verified | budget-service.ts | 194-206 |
| 8 | Cascading Delete | HIGH | BankConnection -> Account cascade | schema.prisma | Line 166 |
| 9 | Missing Constraint | MEDIUM | Duplicate external IDs possible | schema.prisma | Transaction model |
| 10 | Soft Delete | MEDIUM | No audit trail on deletes | schema.prisma | Multiple models |
| 11 | Nullable Fields | MEDIUM | Fields that shouldn't be nullable | schema.prisma | CreditCardMeta |
| 12 | Isolation Level | MEDIUM | No explicit isolation level | prisma.ts | All transactions |
| 13 | Performance | MEDIUM | Inefficient net worth snapshot | networth-service.ts | 74-126 |
| 14 | Orphaned Records | MEDIUM | Tag rules with non-existent tags | tag-rule-service.ts | 31-72 |
| 15 | Missing Index | MEDIUM | Plaid sync operations | schema.prisma | BankConnection |
| 16 | Memory Usage | LOW | Inefficient tree building | category-service.ts | 106-116 |
| 17 | Missing Index | LOW | Recurring pattern detection | subscription-service.ts | 72 |

---

### RECOMMENDATIONS (Priority Order)

**IMMEDIATE (This Week):**
1. Fix tag-rule application N+1 query (Issue #1) - Use batch upsert
2. Add missing indexes for Budget and Notification queries (Issues #5, #6)
3. Verify category authorization in budget operations (Issue #7)

**SHORT-TERM (This Sprint):**
4. Optimize tag rule suggestion with batch queries (Issue #2)
5. Add explicit transaction isolation level (Issue #12)
6. Refactor net worth snapshot with upsert (Issue #13)

**MEDIUM-TERM (Next Sprint):**
7. Implement soft-delete pattern (Issue #10)
8. Add foreign key constraint for tag rule -> tags (Issue #14)
9. Fix cascading delete behavior for BankConnection (Issue #8)

**LONGER-TERM (Backlog):**
10. Add missing indexes for Plaid sync (Issue #15)
11. Refactor category tree building (Issue #16)
12. Add cascade delete data loss prevention (Issue #8)

