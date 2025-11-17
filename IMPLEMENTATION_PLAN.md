# Income Tracker - Complete Implementation Plan

**Version:** 1.0
**Date:** 2025-11-17
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Implementation Phases](#implementation-phases)
5. [Database Schema](#database-schema)
6. [API Architecture](#api-architecture)
7. [UI/UX Implementation](#uiux-implementation)
8. [AI Integration](#ai-integration)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Plan](#deployment-plan)
11. [Timeline & Milestones](#timeline--milestones)

---

## Executive Summary

This is a comprehensive personal finance application that provides:

- **Multi-region finance tracking** (TR/UK with FX conversion)
- **Net worth calculation** with assets, liabilities, and receivables
- **Credit card analytics** with interest tracking, tag-based spending, and installment management
- **Recurring costs & income** with flexible periods (weekly, biweekly, monthly, yearly, custom)
- **AI-powered document processing** using Gemini 2.5 for PDFs and images
- **Smart tagging system** with learning and classification rules
- **Predictive forecasting** using Holt-Winters with cash flow overlays
- **Natural language Q&A** powered by OpenAI

---

## Tech Stack

### Core Framework
- **Next.js 14+** (App Router)
- **TypeScript** (strict mode)
- **React 18+**

### Database & ORM
- **Supabase** (PostgreSQL)
- **Prisma** (ORM with type safety)

### Authentication
- **Clerk** (multi-provider auth)

### UI & Styling
- **Tailwind CSS** (utility-first)
- **shadcn/ui** (component library)
- **Recharts** (data visualization)
- **Radix UI** (headless components)
- **Lucide React** (icons)

### AI & ML
- **Gemini 2.5** (document processing with structured output)
- **OpenAI GPT-4** (natural language Q&A via Vercel AI SDK)

### Development Tools
- **ESLint** (linting)
- **Prettier** (formatting)
- **Husky** (git hooks)
- **lint-staged** (pre-commit)

### Testing
- **Vitest** (unit tests)
- **Playwright** (E2E tests)
- **React Testing Library** (component tests)

### Deployment
- **Vercel** (hosting & CI/CD)
- **GitHub Actions** (additional workflows)

---

## Project Structure

```
income-tracker/
├── .github/
│   └── workflows/          # CI/CD workflows
├── .husky/                 # Git hooks
├── app/
│   ├── (auth)/            # Auth routes (sign-in, sign-up)
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── page.tsx       # Main dashboard
│   │   ├── accounts/
│   │   ├── transactions/
│   │   ├── cards/
│   │   ├── recurring/
│   │   ├── tags/
│   │   ├── imports/
│   │   ├── review/
│   │   ├── forecasts/
│   │   └── ask/           # AI Q&A
│   ├── api/
│   │   ├── accounts/
│   │   ├── transactions/
│   │   ├── cards/
│   │   ├── recurring/
│   │   ├── tags/
│   │   ├── documents/
│   │   ├── forecasts/
│   │   ├── ai/
│   │   └── webhooks/
│   ├── layout.tsx         # Root layout with Clerk
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── dashboard/         # Dashboard-specific components
│   ├── cards/             # Card analytics components
│   ├── charts/            # Recharts wrappers
│   ├── forms/             # Form components
│   └── layout/            # Layout components
├── lib/
│   ├── prisma.ts          # Prisma client singleton
│   ├── ai/
│   │   ├── gemini.ts      # Gemini 2.5 client
│   │   └── openai.ts      # OpenAI client (Vercel AI SDK)
│   ├── forecast/
│   │   ├── holt-winters.ts
│   │   └── cash-flow.ts
│   ├── currency/
│   │   └── fx-rates.ts    # FX conversion
│   ├── classification/
│   │   └── rules.ts       # Tag classification engine
│   ├── utils.ts           # Shared utilities
│   └── validations.ts     # Zod schemas
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # Prisma migrations
│   └── seed.ts            # Seed data
├── public/
│   ├── images/
│   └── fonts/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example           # Environment variables template
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── middleware.ts          # Clerk middleware
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## Implementation Phases

### Phase 0: Project Setup (Week 1)

**Goal:** Initialize project with all dependencies and configuration

#### Tasks:
1. **Initialize Next.js project**
   - `npx create-next-app@latest income-tracker --typescript --tailwind --app --src-dir=false`
   - Configure TypeScript strict mode
   - Set up ESLint & Prettier

2. **Install core dependencies**
   ```bash
   # Database & ORM
   npm install @prisma/client
   npm install -D prisma

   # Auth
   npm install @clerk/nextjs

   # UI Components
   npx shadcn-ui@latest init
   npm install recharts
   npm install lucide-react

   # AI
   npm install @google/generative-ai
   npm install ai openai

   # Utilities
   npm install zod
   npm install date-fns
   npm install decimal.js

   # Testing
   npm install -D vitest @testing-library/react @testing-library/jest-dom
   npm install -D @playwright/test
   ```

3. **Set up Prisma**
   - Initialize: `npx prisma init`
   - Configure Supabase connection string
   - Create initial schema
   - Run first migration

4. **Configure Clerk**
   - Set up Clerk application
   - Add API keys to `.env`
   - Configure middleware
   - Create auth pages

5. **Set up shadcn/ui**
   - Install base components: button, card, input, form, dialog, table, etc.
   - Configure theme and colors
   - Set up dark mode support

6. **Configure development tools**
   - Husky for git hooks
   - lint-staged for pre-commit
   - VS Code settings
   - Debugging configuration

#### Deliverables:
- ✅ Project initialized and running locally
- ✅ All dependencies installed
- ✅ Database connected
- ✅ Authentication working
- ✅ Development environment ready

---

### Phase 1: Core Data Layer (Week 2)

**Goal:** Implement complete database schema and core API routes

#### 1.1 Database Schema Implementation

**Tasks:**
- Implement full Prisma schema (from design doc part 2)
- Create migrations
- Add indexes for performance
- Set up database constraints
- Create seed data for development

**Key Models:**
- User (Clerk integration)
- Account (with region support)
- Institution
- Transaction (with tagging)
- Category (tree structure)
- Tag & TransactionTag
- CreditCardMeta
- InstallmentPlan
- FixedExpense
- IncomeSource
- NetWorthSnapshot
- Prediction
- DocumentUpload
- ExtractedLineItem
- TagRule
- ApiCredential

#### 1.2 Core API Routes

**Routes to implement:**

1. **Accounts API** (`/api/accounts`)
   - GET: List all accounts with filters
   - POST: Create account
   - PATCH /:id: Update account
   - DELETE /:id: Delete account
   - GET /:id/transactions: Account transactions

2. **Transactions API** (`/api/transactions`)
   - GET: List with pagination & filters
   - POST: Create transaction
   - PATCH /:id: Update transaction
   - DELETE /:id: Delete transaction
   - POST /:id/tags: Update transaction tags
   - POST /bulk-tag: Bulk tag operations

3. **Categories API** (`/api/categories`)
   - GET: List all categories (tree)
   - POST: Create category
   - PATCH /:id: Update category
   - DELETE /:id: Delete category

4. **Tags API** (`/api/tags`)
   - GET: List with analytics
   - POST: Create tag
   - PATCH /:id: Update tag
   - DELETE /:id: Delete tag
   - POST /merge: Merge tags

#### 1.3 Utilities & Helpers

**Files to create:**
- `lib/prisma.ts`: Singleton client
- `lib/utils.ts`: Shared utilities
- `lib/validations.ts`: Zod schemas for API validation
- `lib/errors.ts`: Error handling
- `lib/currency/fx-rates.ts`: FX conversion logic

#### Deliverables:
- ✅ Complete Prisma schema
- ✅ Database migrations applied
- ✅ Core CRUD APIs for accounts, transactions, categories, tags
- ✅ API validation with Zod
- ✅ Error handling middleware

---

### Phase 2: Dashboard & Core UI (Week 3)

**Goal:** Build main dashboard and essential UI components

#### 2.1 Layout & Navigation

**Components:**
- `app/layout.tsx`: Root layout with Clerk
- `app/(dashboard)/layout.tsx`: Dashboard layout with sidebar
- `components/layout/Sidebar.tsx`: Navigation sidebar
- `components/layout/Header.tsx`: Top header with user menu
- `components/layout/MobileNav.tsx`: Mobile navigation

**Features:**
- Responsive design (mobile-first)
- Dark mode toggle
- User profile dropdown
- Region switcher (TR/UK/Global)
- Currency display preference

#### 2.2 Dashboard Page

**File:** `app/(dashboard)/page.tsx`

**Sections:**

1. **Summary Cards** (top row)
   - Net Worth (with trend)
   - Total Assets
   - Total Debt
   - Receivables

2. **Region Strip** (second row)
   - TR: Net worth, income (30d), expense (30d), savings rate
   - UK: Same metrics
   - Combined view

3. **Net Worth Chart** (main section)
   - Historical line chart (Recharts)
   - 5-month & 12-month forecast toggle
   - Confidence bands (upper/lower bounds)
   - Interactive tooltips
   - Date range selector

4. **Quick Actions** (cards)
   - Add transaction
   - Upload document
   - Add recurring expense
   - View card analytics

**Components to build:**
- `components/dashboard/SummaryCard.tsx`
- `components/dashboard/RegionStrip.tsx`
- `components/dashboard/NetWorthChart.tsx`
- `components/dashboard/QuickActions.tsx`

#### 2.3 Accounts Page

**File:** `app/(dashboard)/accounts/page.tsx`

**Features:**
- Grid/list view toggle
- Filter by type, region, currency
- Account cards showing:
  - Name, institution, type
  - Balance
  - Currency
  - Last synced
  - Quick actions (edit, delete, view transactions)

**Components:**
- `components/accounts/AccountCard.tsx`
- `components/accounts/AccountForm.tsx` (dialog)
- `components/accounts/AccountFilters.tsx`

#### 2.4 Transactions Page

**File:** `app/(dashboard)/transactions/page.tsx`

**Features:**
- Data table with sorting, filtering, pagination
- Columns: Date, Account, Description, Merchant, Category, Tags, Amount
- Filters:
  - Date range
  - Account
  - Category
  - Tags (multi-select)
  - Amount range
  - Text search
- Bulk actions:
  - Tag/untag
  - Categorize
  - Delete
- Export to CSV

**Components:**
- `components/transactions/TransactionTable.tsx`
- `components/transactions/TransactionFilters.tsx`
- `components/transactions/TransactionForm.tsx`
- `components/transactions/BulkActions.tsx`
- `components/ui/data-table.tsx` (reusable)

#### Deliverables:
- ✅ Dashboard with all summary cards and charts
- ✅ Accounts management UI
- ✅ Transactions list with filters and bulk actions
- ✅ Responsive design working on mobile
- ✅ Navigation and layout complete

---

### Phase 3: Credit Card Analytics (Week 4)

**Goal:** Implement comprehensive credit card analytics features

#### 3.1 Cards List & API

**API Route:** `/api/cards`
- GET: List all credit card accounts
- GET /:id/analytics: Detailed card analytics
- GET /analytics/global: Global card analytics

**Implementation:**
- Calculate utilization %
- Aggregate interest & fees
- Compute spend by tags
- List installments
- Payoff simulation logic

#### 3.2 Cards UI

**File:** `app/(dashboard)/cards/page.tsx`

**Features:**
- Grid of credit cards
- Each card shows:
  - Bank logo
  - Card name
  - Balance vs limit
  - Utilization bar
  - Quick stats

**File:** `app/(dashboard)/cards/[id]/page.tsx`

**Sections:**

1. **Card Header**
   - Card details
   - Balance, limit, utilization

2. **Interest & Fees Tab**
   - Total interest (12 months)
   - Total fees (12 months)
   - Monthly chart (Recharts area)

3. **Spending Tab**
   - Pie chart by tags
   - Table of tag spending
   - Filter by date range

4. **Installments Tab**
   - Active installment plans table
   - Timeline view (upcoming months)
   - Total monthly obligation

5. **Payoff Simulator Tab**
   - Slider for monthly payment
   - Comparison: minimum vs aggressive
   - Months to payoff
   - Interest saved

**Components:**
- `components/cards/CardGrid.tsx`
- `components/cards/CardDetail.tsx`
- `components/cards/InterestChart.tsx`
- `components/cards/SpendingByTag.tsx`
- `components/cards/InstallmentTimeline.tsx`
- `components/cards/PayoffSimulator.tsx`

#### 3.3 Installments Management

**File:** `app/(dashboard)/installments/page.tsx`

**Features:**
- List all installment plans
- Group by card
- Monthly payment schedule view
- Edit/delete installments
- Mark as paid

**API Route:** `/api/installments`
- GET: List plans with schedule
- POST: Create plan
- PATCH /:id: Update plan
- DELETE /:id: Delete plan

#### Deliverables:
- ✅ Credit card analytics API
- ✅ Card list and detail pages
- ✅ Interest & fee tracking
- ✅ Tag-based spending analysis
- ✅ Installment management
- ✅ Payoff simulator

---

### Phase 4: Recurring Costs & Income (Week 5)

**Goal:** Implement flexible recurring expenses and income sources

#### 4.1 Recurring Expenses API

**Route:** `/api/recurring/expenses`
- GET: List all fixed expenses
- POST: Create expense
- PATCH /:id: Update expense
- DELETE /:id: Delete expense
- GET /summary: Regional summary

**Logic:**
- Support all period types (WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM)
- Calculate next due dates
- Normalize to monthly amounts for analytics
- Regional breakdown (TR vs UK)

#### 4.2 Income Sources API

**Route:** `/api/recurring/incomes`
- Similar structure to expenses
- Support variability factor
- Calculate expected amounts

#### 4.3 UI Implementation

**File:** `app/(dashboard)/recurring/page.tsx`

**Tabs:**
1. **Expenses Tab**
   - Table of fixed expenses
   - Columns: Name, Amount, Period, Next due, Account, Region
   - Actions: Edit, Delete
   - "Add Expense" button

2. **Income Tab**
   - Similar to expenses
   - Additional: Variability indicator

3. **Summary Tab**
   - Cards showing:
     - TR monthly life cost
     - UK monthly life cost
     - Global monthly life cost
   - Breakdown by category
   - Timeline of upcoming payments

**Components:**
- `components/recurring/ExpenseTable.tsx`
- `components/recurring/ExpenseForm.tsx`
- `components/recurring/IncomeTable.tsx`
- `components/recurring/IncomeForm.tsx`
- `components/recurring/RecurringSummary.tsx`

**Form Features:**
- Period selector (dropdown)
- Custom interval input (for biweekly, etc.)
- Account selector (filters by region)
- Category selector
- Next due date picker
- Amount with currency

#### Deliverables:
- ✅ Recurring expenses CRUD
- ✅ Income sources CRUD
- ✅ Period calculation logic
- ✅ Regional summary
- ✅ UI for managing recurring items

---

### Phase 5: Tagging System (Week 6)

**Goal:** Build powerful tagging with analytics and classification rules

#### 5.1 Tags API Enhancement

**Routes:**
- `/api/tags` (already built in Phase 1, enhance here)
- `/api/tag-rules`
  - GET: List classification rules
  - POST: Create rule
  - PATCH /:id: Update rule
  - DELETE /:id: Delete rule
  - POST /apply: Apply rules to untagged transactions

**Classification Engine:**
- File: `lib/classification/rules.ts`
- Functions:
  - `applyRules(transaction)`: Apply all matching rules
  - `suggestTags(transaction)`: ML-based suggestions
  - `learnFromUserAction(transaction, tags)`: Create/update rules

#### 5.2 Tags Analytics Page

**File:** `app/(dashboard)/tags/page.tsx`

**Features:**
- Tag list with stats:
  - Name, color
  - 30-day spend
  - 12-month spend
  - Transaction count
  - Top merchants
  - Top cards
- Search/filter tags
- Create/edit/delete tags
- Merge tags dialog

**File:** `app/(dashboard)/tags/[id]/page.tsx`

**Tag Detail Page:**
- Tag info header
- Spending chart over time (Recharts)
- Breakdown by:
  - Card
  - Region (TR/UK)
  - Month
- Top merchants table
- Recent transactions with this tag

**Components:**
- `components/tags/TagList.tsx`
- `components/tags/TagForm.tsx`
- `components/tags/TagAnalytics.tsx`
- `components/tags/TagSpendingChart.tsx`
- `components/tags/MergeTagsDialog.tsx`

#### 5.3 Tag Rules UI

**File:** `app/(dashboard)/tags/rules/page.tsx`

**Features:**
- Table of rules:
  - Pattern, Type, Tags, Category, Active
- Create rule from:
  - Manual pattern entry
  - From transaction (quick action)
- Test rule against transactions
- Enable/disable rules
- Priority ordering

**Components:**
- `components/tags/RulesList.tsx`
- `components/tags/RuleForm.tsx`
- `components/tags/RuleTester.tsx`

#### Deliverables:
- ✅ Tag classification rules
- ✅ Auto-tagging engine
- ✅ Tags analytics page
- ✅ Tag detail page with charts
- ✅ Rules management UI
- ✅ Merge tags functionality

---

### Phase 6: Multi-Region & Currency (Week 7)

**Goal:** Implement TR/UK analytics and FX conversion

#### 6.1 FX Rates System

**File:** `lib/currency/fx-rates.ts`

**Functions:**
- `getFxRate(from, to, date)`: Get rate for specific date
- `convert(amount, from, to, date?)`: Convert amount
- `updateRates()`: Fetch latest rates (cron job)

**Data Source:**
- Use free API (e.g., exchangerate-api.io, fixer.io)
- Cache rates in database (table: `ExchangeRate`)
- Update daily via cron

**Prisma model:**
```prisma
model ExchangeRate {
  id        String   @id @default(cuid())
  from      String
  to        String
  rate      Decimal  @db.Decimal(18, 8)
  date      DateTime

  @@unique([from, to, date])
  @@index([date])
}
```

#### 6.2 Net Worth API

**Route:** `/api/net-worth/summary`

**Response:**
- Global net worth (in base currency)
- Regional breakdowns (TR, UK)
- Asset/liability categories
- Receivables list

**Logic:**
- Aggregate all accounts by region
- Convert to base currency
- Calculate net worth = assets - liabilities
- Break down by account type

#### 6.3 Regions Page

**File:** `app/(dashboard)/regions/page.tsx`

**Tabs:** Global, TR, UK

**For each region:**
- Summary cards:
  - Net worth
  - Income (30d)
  - Expenses (30d)
  - Savings rate
- Account list (filtered by region)
- Top spending categories
- Top tags
- Income vs expense chart

**Components:**
- `components/regions/RegionSummary.tsx`
- `components/regions/RegionAccounts.tsx`
- `components/regions/RegionAnalytics.tsx`

#### 6.4 Currency Display

**Implementation:**
- User preference: base currency
- Display amounts in:
  - Native currency (primary)
  - Base currency (secondary, smaller text)
- Currency selector in header
- Store preference in user settings

**Utility:**
- File: `lib/currency/format.ts`
- Functions:
  - `formatAmount(amount, currency)`: Format with symbol
  - `formatWithBase(amount, currency, baseCurrency)`: Dual display

#### Deliverables:
- ✅ FX rates system with caching
- ✅ Multi-currency conversion
- ✅ Regional analytics
- ✅ Net worth by region
- ✅ Currency display preferences
- ✅ Regions analytics page

---

### Phase 7: Document Import with Gemini 2.5 (Week 8-9)

**Goal:** AI-powered document processing with structured output

#### 7.1 Gemini Integration

**File:** `lib/ai/gemini.ts`

**Setup:**
- Install SDK: `@google/generative-ai`
- Configure API key
- Set up Gemini 2.5 Flash model
- Define response schema for transactions

**Schema:**
```typescript
const transactionSchema = {
  type: "object",
  properties: {
    accountName: { type: "string" },
    periodStart: { type: "string", format: "date" },
    periodEnd: { type: "string", format: "date" },
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", format: "date" },
          description: { type: "string" },
          amount: { type: "number" },
          currency: { type: "string" },
          merchant: { type: "string" },
          isInstallment: { type: "boolean" },
          installmentCount: { type: "number" },
          category: { type: "string" },
          tags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                confidence: { type: "number" }
              }
            }
          }
        }
      }
    }
  }
}
```

**Functions:**
- `extractFromPdf(fileUrl)`: Process PDF
- `extractFromImage(fileUrl)`: Process image
- `parseStructuredOutput(response)`: Parse Gemini response

#### 7.2 Document Upload API

**Route:** `/api/documents`

**Endpoints:**
1. **POST /api/documents**
   - Create presigned upload URL (Supabase Storage)
   - Create DocumentUpload record
   - Return upload URL

2. **POST /api/documents/:id/process**
   - Trigger Gemini processing
   - Update status to PROCESSING
   - Queue background job

3. **GET /api/documents**
   - List documents with status

4. **GET /api/documents/:id/lines**
   - Get extracted line items
   - Filter by status (pending review, confirmed)

5. **POST /api/documents/:id/confirm-lines**
   - Accept/modify extracted lines
   - Create real transactions
   - Create/update tag rules if requested

#### 7.3 Background Processing

**Implementation Options:**

Option A: **Vercel Serverless Functions**
- Use API route with `maxDuration`
- Good for simple processing

Option B: **Queue System** (Better for production)
- Use Inngest or QStash
- Better retry logic
- Status tracking

**Worker Logic:**
```typescript
// File: lib/workers/document-processor.ts

async function processDocument(documentId: string) {
  // 1. Fetch document from Supabase Storage
  // 2. Call Gemini 2.5 with file + schema
  // 3. Parse structured response
  // 4. Apply existing tag rules
  // 5. Create ExtractedLineItem records
  // 6. Mark items with low confidence as needsReview
  // 7. Update DocumentUpload status
}
```

#### 7.4 Imports UI

**File:** `app/(dashboard)/imports/page.tsx`

**Features:**
- Upload dropzone (drag & drop)
- File type: PDF or Image
- Upload progress
- Document list:
  - Filename
  - Upload date
  - Status (uploaded, processing, processed, failed)
  - Lines count
  - Review count
- Click to view details

**File:** `app/(dashboard)/imports/[id]/page.tsx`

**Document Detail:**
- PDF viewer (react-pdf) or image preview
- Extracted lines table:
  - Date, Merchant, Description, Amount
  - Suggested category & tags
  - Confidence score
  - Status badges
- Actions for each line:
  - Accept as-is
  - Edit (modify category/tags)
  - Discard
  - "Always tag like this" (create rule)
- Bulk actions:
  - Accept all high-confidence
  - Review all low-confidence

**Components:**
- `components/imports/UploadDropzone.tsx`
- `components/imports/DocumentList.tsx`
- `components/imports/DocumentDetail.tsx`
- `components/imports/ExtractedLineItem.tsx`
- `components/imports/LineEditor.tsx`
- `components/imports/PdfViewer.tsx`

#### 7.5 Review Queue

**File:** `app/(dashboard)/review/page.tsx`

**Features:**
- Unified queue of all items needing review
- Sources:
  - Extracted lines (low confidence)
  - Installments (needs verification)
  - Transactions (flagged)
- Filters:
  - Source type
  - Confidence threshold
  - Date range
- Review workflow:
  - Show item with context
  - Link to source document
  - Quick actions: Accept, Edit, Discard
  - "Create rule" checkbox
- Batch review mode

**Components:**
- `components/review/ReviewQueue.tsx`
- `components/review/ReviewItem.tsx`
- `components/review/ReviewActions.tsx`

#### Deliverables:
- ✅ Gemini 2.5 integration
- ✅ Structured output parsing
- ✅ Document upload to Supabase Storage
- ✅ Background processing worker
- ✅ Extracted line items with confidence
- ✅ Import UI with PDF/image viewer
- ✅ Review queue
- ✅ Rule creation from reviews

---

### Phase 8: Forecasting Engine (Week 10)

**Goal:** Predictive net worth forecasting with cash flow overlays

#### 8.1 Holt-Winters Implementation

**File:** `lib/forecast/holt-winters.ts`

**Algorithm:**
- Additive model (not multiplicative)
- Components: level, trend, seasonal
- Input: historical NetWorthSnapshot (monthly)
- Output: forecast points with confidence bands

**Functions:**
```typescript
type ForecastPoint = {
  date: Date
  netWorth: number
  lower: number
  upper: number
}

function holtWinters(
  data: { date: Date; value: number }[],
  horizon: number, // months
  alpha: number,   // level smoothing
  beta: number,    // trend smoothing
  gamma: number    // seasonal smoothing
): ForecastPoint[]
```

#### 8.2 Cash Flow Overlay

**File:** `lib/forecast/cash-flow.ts`

**Logic:**
1. For each future month (1-12):
   - Calculate recurring expenses
   - Calculate recurring income
   - Calculate installment payments
2. Net cash flow = income - expenses - installments
3. Cumulative overlay = Σ monthly cash flows
4. Apply to base forecast

**Functions:**
```typescript
type CashFlowOverlay = {
  month: Date
  expenses: number
  income: number
  installments: number
  netCashFlow: number
}

async function calculateCashFlowOverlay(
  userId: string,
  startDate: Date,
  months: number
): Promise<CashFlowOverlay[]>

function applyOverlayToForecast(
  baseForecast: ForecastPoint[],
  overlay: CashFlowOverlay[]
): ForecastPoint[]
```

#### 8.3 Net Worth Snapshots

**Cron Job:**
- Daily: Take snapshot of current net worth
- Aggregate all accounts
- Calculate assets, liabilities, net worth
- Store in NetWorthSnapshot

**File:** `lib/jobs/net-worth-snapshot.ts`

**API Route:** `/api/cron/snapshot` (protected by Vercel Cron secret)

#### 8.4 Forecast API

**Route:** `/api/forecasts/net-worth`

**GET:**
- Query params: `?horizon=12` (months)
- Response: forecast points with overlay

**POST /recompute:**
- Trigger fresh forecast calculation
- Use latest snapshots + recurring + installments

#### 8.5 Forecast UI

**Component:** Already in Dashboard (`components/dashboard/NetWorthChart.tsx`)

**Enhancements:**
- Toggle: Historical, 5-month, 12-month
- Confidence bands (shaded area)
- Hover tooltip showing:
  - Base forecast
  - Cash flow overlay
  - Final forecast
  - Upper/lower bounds
- Legend:
  - Historical (solid line)
  - Forecast (dashed line)
  - Confidence (shaded)
- Scenario mode:
  - "What if rent increases 20%?"
  - "What if I add $500/month income?"
  - Adjust sliders, see forecast update

**Components:**
- `components/forecasts/ScenarioBuilder.tsx`
- `components/forecasts/ForecastLegend.tsx`

#### Deliverables:
- ✅ Holt-Winters forecasting algorithm
- ✅ Cash flow overlay calculation
- ✅ Net worth snapshot cron job
- ✅ Forecast API
- ✅ Interactive forecast chart
- ✅ Scenario builder (what-if analysis)

---

### Phase 9: AI Q&A with OpenAI (Week 11)

**Goal:** Natural language financial assistant

#### 9.1 OpenAI Integration

**File:** `lib/ai/openai.ts`

**Setup:**
- Use Vercel AI SDK: `npm install ai openai`
- Configure API key
- Use GPT-4 or GPT-4-turbo

**Implementation:**
```typescript
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

async function askFinancialQuestion(
  userId: string,
  question: string,
  locale: string = 'en'
): Promise<string> {
  // 1. Fetch relevant aggregated data
  const context = await getFinancialContext(userId, question)

  // 2. Build system prompt
  const systemPrompt = `You are a helpful financial assistant...`

  // 3. Call OpenAI
  const { text } = await generateText({
    model: openai('gpt-4-turbo'),
    system: systemPrompt,
    prompt: question,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ]
  })

  return text
}
```

**Context Builder:**
```typescript
async function getFinancialContext(
  userId: string,
  question: string
) {
  // Analyze question to determine what data is needed
  // Fetch only aggregated data (no PII)

  return {
    netWorth: { current, trend },
    spending: { byTag, byCategory, byRegion },
    income: { total, sources },
    debt: { total, byCard },
    forecast: { next12months }
  }
}
```

#### 9.2 API Route

**Route:** `/api/ai/ask`

**POST:**
```typescript
type AskRequest = {
  question: string
  locale?: string
}

type AskResponse = {
  answer: string
  context?: object // optional: show what data was used
}
```

**Rate Limiting:**
- Use Upstash Rate Limit or similar
- Limit: 10 requests per minute per user

#### 9.3 UI Implementation

**File:** `app/(dashboard)/ask/page.tsx`

**Features:**
- Chat-like interface
- Input textarea with "Ask" button
- Conversation history (client-side state)
- Pre-built question buttons:
  - "How much did I spend on clothing this year?"
  - "What's my total interest paid in TR?"
  - "What's my net worth forecast for 6 months?"
  - "How much are my monthly life costs in UK?"
  - "What if rent increases 25%?"
- Streaming responses (use Vercel AI SDK streaming)
- Copy answer button
- Clear conversation

**Components:**
- `components/ai/ChatInterface.tsx`
- `components/ai/MessageBubble.tsx`
- `components/ai/QuickQuestions.tsx`
- `components/ai/StreamingMessage.tsx`

#### 9.4 Privacy & Safety

**Measures:**
- Never send raw transaction descriptions to OpenAI
- Only send aggregated numbers
- User can opt-out in settings
- Warn user about data usage
- Log all AI queries for audit

#### Deliverables:
- ✅ OpenAI integration with Vercel AI SDK
- ✅ Financial context builder
- ✅ AI Q&A API
- ✅ Chat interface UI
- ✅ Pre-built question templates
- ✅ Streaming responses
- ✅ Privacy safeguards

---

### Phase 10: Testing & Quality Assurance (Week 12)

**Goal:** Comprehensive test coverage

#### 10.1 Unit Tests (Vitest)

**Setup:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Test Files:**
- `tests/unit/lib/currency/fx-rates.test.ts`
- `tests/unit/lib/forecast/holt-winters.test.ts`
- `tests/unit/lib/classification/rules.test.ts`
- `tests/unit/components/dashboard/*.test.tsx`

**Coverage Target:** 80% for utilities and logic

#### 10.2 Integration Tests

**Test API Routes:**
- `tests/integration/api/accounts.test.ts`
- `tests/integration/api/transactions.test.ts`
- `tests/integration/api/forecasts.test.ts`

**Setup:**
- Use test database
- Seed test data
- Mock external APIs (Gemini, OpenAI)

#### 10.3 E2E Tests (Playwright)

**Setup:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Test Scenarios:**
- User sign-up flow
- Add account → add transaction → tag it
- Upload PDF → review → confirm
- View card analytics
- Create forecast scenario
- Ask AI question

**Files:**
- `tests/e2e/auth.spec.ts`
- `tests/e2e/transactions.spec.ts`
- `tests/e2e/imports.spec.ts`
- `tests/e2e/forecasts.spec.ts`

#### 10.4 Performance Testing

**Tools:**
- Lighthouse (in CI)
- Core Web Vitals monitoring

**Targets:**
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

#### Deliverables:
- ✅ 80%+ unit test coverage
- ✅ Integration tests for all API routes
- ✅ E2E tests for critical flows
- ✅ Performance benchmarks

---

### Phase 11: Deployment & DevOps (Week 13)

**Goal:** Production-ready deployment on Vercel

#### 11.1 Environment Setup

**Environment Variables:**
```bash
# Database
DATABASE_URL=
DIRECT_URL=

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI
GOOGLE_GEMINI_API_KEY=
OPENAI_API_KEY=

# Storage
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# FX Rates
FX_RATES_API_KEY=

# Misc
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

#### 11.2 Vercel Configuration

**File:** `vercel.json`
```json
{
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

#### 11.3 GitHub Actions

**File:** `.github/workflows/ci.yml`

**Jobs:**
- Lint & type-check
- Run unit tests
- Run integration tests
- Build production bundle
- Deploy preview (on PR)
- Deploy production (on merge to main)

#### 11.4 Database Migrations

**Strategy:**
- Use Prisma Migrate in production
- Migrations run automatically on deploy (Vercel build)
- Keep migration history in Git

**File:** `package.json`
```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

#### 11.5 Monitoring & Logging

**Tools:**
- Vercel Analytics (built-in)
- Sentry (error tracking)
- LogRocket or Highlight.io (session replay)

**Setup:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

#### 11.6 Backup Strategy

**Database:**
- Supabase automatic backups (enabled by default)
- Point-in-time recovery available

**Storage:**
- Supabase Storage backups

#### Deliverables:
- ✅ Deployed to Vercel production
- ✅ Environment variables configured
- ✅ Cron jobs running
- ✅ CI/CD pipeline active
- ✅ Error tracking with Sentry
- ✅ Database backup verified

---

## Database Schema

*(See design doc part 2 for full Prisma schema)*

**Key Entities:**
1. User (Clerk integration)
2. Account (multi-region, multi-currency)
3. Transaction (with tags)
4. Category (tree)
5. Tag & TransactionTag
6. InstallmentPlan
7. FixedExpense
8. IncomeSource
9. NetWorthSnapshot
10. Prediction
11. DocumentUpload
12. ExtractedLineItem
13. TagRule
14. ExchangeRate

---

## API Architecture

**RESTful API Routes:**
- `/api/accounts` - Account management
- `/api/transactions` - Transactions CRUD
- `/api/categories` - Category management
- `/api/tags` - Tags & analytics
- `/api/tag-rules` - Classification rules
- `/api/recurring/expenses` - Fixed expenses
- `/api/recurring/incomes` - Income sources
- `/api/cards` - Credit card analytics
- `/api/installments` - Installment plans
- `/api/documents` - Document upload & processing
- `/api/review` - Review queue
- `/api/forecasts` - Forecasting
- `/api/ai/ask` - AI Q&A
- `/api/net-worth` - Net worth summary
- `/api/cron/*` - Background jobs

**Authentication:**
- All routes protected by Clerk middleware
- `auth().userId` for user context

**Validation:**
- Zod schemas for request/response
- Centralized error handling

---

## UI/UX Implementation

**Design System:**
- shadcn/ui components
- Tailwind CSS utilities
- Consistent spacing (4px grid)
- Color palette:
  - Primary: Blue (#3b82f6)
  - Success: Green (#10b981)
  - Danger: Red (#ef4444)
  - Warning: Yellow (#f59e0b)
  - TR: Orange (#f97316)
  - UK: Purple (#8b5cf6)

**Components Library:**
- Data tables with sorting/filtering
- Charts (Recharts wrappers)
- Forms (React Hook Form + Zod)
- Dialogs & modals
- Cards & stats
- Loading states & skeletons
- Error boundaries

**Responsive Design:**
- Mobile-first approach
- Breakpoints: sm (640), md (768), lg (1024), xl (1280)
- Collapsible sidebar on mobile
- Touch-friendly buttons (min 44px)

**Accessibility:**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Focus indicators
- Color contrast ratios

---

## AI Integration

### Gemini 2.5 (Document Processing)

**Use Case:** Extract transactions from PDFs and images

**Implementation:**
- Model: `gemini-2.5-flash`
- Method: Structured output with response schema
- Input: PDF bytes or image
- Output: JSON with transactions array
- Confidence scoring for each field
- Retry logic for failures

**Workflow:**
1. User uploads PDF/image
2. File stored in Supabase Storage
3. Background job sends to Gemini
4. Structured response parsed
5. ExtractedLineItem records created
6. Low-confidence items flagged for review

### OpenAI (Q&A)

**Use Case:** Natural language financial queries

**Implementation:**
- Model: GPT-4-turbo
- Method: Vercel AI SDK with streaming
- Input: User question + financial context
- Output: Streaming text response
- Rate limiting: 10 req/min

**Privacy:**
- Only aggregate data sent
- No raw transaction text
- User opt-in required

---

## Testing Strategy

### Unit Tests (Vitest)
- All utility functions
- Business logic
- React components (isolated)

### Integration Tests
- API routes
- Database operations
- External API mocks

### E2E Tests (Playwright)
- Critical user journeys
- Cross-browser testing
- Mobile viewport testing

### Manual Testing
- Exploratory testing
- Usability testing
- Cross-device testing

---

## Deployment Plan

### Environments

1. **Development**
   - Local machine
   - Test database
   - Mock external APIs

2. **Preview** (Vercel)
   - Per-PR deployment
   - Preview database
   - Real APIs (test mode)

3. **Production** (Vercel)
   - Main branch auto-deploy
   - Production database
   - Real APIs (production)

### Deployment Steps

1. Merge to main branch
2. GitHub Actions run tests
3. Vercel builds & deploys
4. Prisma migrations run
5. Health check
6. Rollback if failed

### Monitoring

- Vercel Analytics
- Sentry error tracking
- Database performance (Supabase dashboard)
- Uptime monitoring (UptimeRobot)

---

## Timeline & Milestones

### Week 1: Foundation
- ✅ Project setup
- ✅ Dependencies installed
- ✅ Database connected
- ✅ Auth working

### Week 2: Core Data
- ✅ Prisma schema complete
- ✅ Core APIs (accounts, transactions, categories, tags)

### Week 3: Dashboard UI
- ✅ Layout & navigation
- ✅ Dashboard page
- ✅ Accounts page
- ✅ Transactions page

### Week 4: Credit Cards
- ✅ Card analytics API
- ✅ Card detail page
- ✅ Installments management

### Week 5: Recurring
- ✅ Fixed expenses
- ✅ Income sources
- ✅ Regional summary

### Week 6: Tagging
- ✅ Tag analytics
- ✅ Classification rules
- ✅ Auto-tagging

### Week 7: Multi-Region
- ✅ FX rates system
- ✅ Regional analytics
- ✅ Currency conversion

### Week 8-9: AI Import
- ✅ Gemini integration
- ✅ Document processing
- ✅ Review queue
- ✅ Rule learning

### Week 10: Forecasting
- ✅ Holt-Winters algorithm
- ✅ Cash flow overlay
- ✅ Forecast API & UI

### Week 11: AI Q&A
- ✅ OpenAI integration
- ✅ Chat interface
- ✅ Question templates

### Week 12: Testing
- ✅ Unit tests
- ✅ Integration tests
- ✅ E2E tests

### Week 13: Deployment
- ✅ Production deploy
- ✅ Monitoring setup
- ✅ Documentation

### Week 14+: Iteration
- User feedback
- Performance optimization
- Feature enhancements
- Bug fixes

---

## Success Criteria

### MVP Launch (Week 3)
- [ ] User can sign up/sign in
- [ ] User can add accounts (TR & UK)
- [ ] User can add transactions manually
- [ ] User can view dashboard with net worth
- [ ] User can categorize and tag transactions
- [ ] Responsive on mobile & desktop

### Full Launch (Week 13)
- [ ] All features from design doc implemented
- [ ] 80%+ test coverage
- [ ] Performance: Lighthouse score > 90
- [ ] Accessibility: WCAG AA compliant
- [ ] Documentation complete
- [ ] Deployed to production
- [ ] Monitoring & alerts active

### Post-Launch
- [ ] User onboarding flow
- [ ] Help documentation
- [ ] Video tutorials
- [ ] Bank API integrations
- [ ] Mobile app (React Native)

---

## Risks & Mitigations

### Technical Risks

1. **Gemini 2.5 API reliability**
   - Mitigation: Retry logic, fallback to manual entry

2. **Forecast accuracy**
   - Mitigation: Multiple models, user adjustments, confidence intervals

3. **FX rate data quality**
   - Mitigation: Multiple data sources, manual override

4. **Database performance**
   - Mitigation: Proper indexing, caching, pagination

### Business Risks

1. **User adoption**
   - Mitigation: Focus on UX, clear value prop, onboarding

2. **Data privacy concerns**
   - Mitigation: Clear privacy policy, encryption, user controls

3. **Cost (AI APIs)**
   - Mitigation: Rate limiting, caching, user quotas

---

## Next Steps

After this plan is approved:

1. **Clarify open questions** (see Questions section)
2. **Phase 0: Project Setup** - Initialize repository
3. **Phase 1: Core Data Layer** - Implement schema & APIs
4. **Phase 2: Dashboard UI** - Build main interface
5. **Iterate** through remaining phases

---

## Appendix

### Recommended VS Code Extensions
- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- GitLens
- Error Lens

### Useful Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Clerk Docs](https://clerk.com/docs)
- [Gemini API](https://ai.google.dev/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

---

**End of Implementation Plan**
