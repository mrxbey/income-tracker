# Quick Start Guide

**Income Tracker Application**

This guide will help you get the project up and running quickly.

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** or **pnpm**
- **Git** installed
- **Supabase** account ([Sign up](https://supabase.com/))
- **Clerk** account ([Sign up](https://clerk.com/))
- **Google AI Studio** account for Gemini API ([Get API key](https://makersuite.google.com/app/apikey))
- **OpenAI** account ([Get API key](https://platform.openai.com/api-keys))

---

## Step 1: Clone and Install

```bash
# Initialize Next.js project with TypeScript and Tailwind
npx create-next-app@latest income-tracker \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias "@/*"

cd income-tracker

# Install core dependencies
npm install @prisma/client
npm install -D prisma

npm install @clerk/nextjs

npm install recharts lucide-react
npm install zod
npm install date-fns decimal.js

npm install @google/generative-ai
npm install ai openai

# Install shadcn/ui
npx shadcn-ui@latest init
```

When prompted by shadcn/ui:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

```bash
# Install commonly used shadcn components
npx shadcn-ui@latest add button card input label form dialog table dropdown-menu
```

---

## Step 2: Set Up Supabase

1. **Create a new project** at [supabase.com](https://supabase.com/)
2. **Get your connection strings** from Settings → Database
3. Copy both:
   - Connection string (for connection pooling)
   - Direct connection (for migrations)

---

## Step 3: Set Up Clerk

1. **Create a new application** at [clerk.com](https://clerk.com/)
2. **Get your API keys** from API Keys page
3. Copy:
   - Publishable Key
   - Secret Key

---

## Step 4: Configure Environment Variables

Create `.env` file in project root:

```bash
# Database (Supabase)
DATABASE_URL="postgresql://postgres.[PROJECT-ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# AI APIs
GOOGLE_GEMINI_API_KEY="..."
OPENAI_API_KEY="sk-..."

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_KEY="..."

# App Config
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cron Secret (generate random string)
CRON_SECRET="your-random-secret-here"
```

Create `.env.example` (without actual values):

```bash
# Copy .env to .env.example and remove sensitive values
cp .env .env.example

# Edit .env.example to remove actual keys (keep structure)
```

---

## Step 5: Initialize Prisma

```bash
# Initialize Prisma
npx prisma init

# This creates:
# - prisma/schema.prisma
# - .env (if it doesn't exist)
```

**Replace** `prisma/schema.prisma` with the schema from `IMPLEMENTATION_PLAN.md` (see part 2 of your design docs).

Then run:

```bash
# Generate Prisma Client
npx prisma generate

# Create and apply first migration
npx prisma migrate dev --name init

# Open Prisma Studio to verify
npx prisma studio
```

---

## Step 6: Configure Clerk Middleware

Create `middleware.ts` in project root:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

---

## Step 7: Set Up Basic Layout

Update `app/layout.tsx`:

```typescript
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Income Tracker',
  description: 'Personal finance tracking with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

---

## Step 8: Create Prisma Client Singleton

Create `lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

---

## Step 9: Create Auth Pages

Create sign-in page:

```bash
mkdir -p app/\(auth\)/sign-in
```

Create `app/(auth)/sign-in/[[...sign-in]]/page.tsx`:

```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
```

Create sign-up page:

```bash
mkdir -p app/\(auth\)/sign-up
```

Create `app/(auth)/sign-up/[[...sign-up]]/page.tsx`:

```typescript
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  )
}
```

---

## Step 10: Create Dashboard Layout

Create `app/(dashboard)/layout.tsx`:

```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Income Tracker</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
```

Create `app/(dashboard)/page.tsx`:

```typescript
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/prisma'

export default async function DashboardPage() {
  const { userId } = auth()

  const accountCount = await db.account.count({
    where: { userId: userId! },
  })

  return (
    <div>
      <h2 className="text-3xl font-bold mb-4">Dashboard</h2>
      <p>You have {accountCount} accounts.</p>
    </div>
  )
}
```

---

## Step 11: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

You should see:
1. Landing page
2. Click sign-in/sign-up
3. After auth, redirected to dashboard

---

## Step 12: Create Seed Data (Optional)

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create test user (use your Clerk userId)
  const userId = 'user_YOUR_CLERK_ID'

  // Create categories
  const foodCategory = await prisma.category.create({
    data: {
      userId,
      name: 'Food & Dining',
      type: 'EXPENSE',
    },
  })

  // Create tags
  const groceriesTag = await prisma.tag.create({
    data: {
      userId,
      name: 'Groceries',
      slug: 'groceries',
      color: '#10b981',
      isSystem: true,
    },
  })

  // Create account
  const account = await prisma.account.create({
    data: {
      userId,
      name: 'Main Checking',
      type: 'DEPOSIT',
      currency: 'USD',
      countryCode: 'US',
      regionGroup: 'US',
      balance: 5000,
    },
  })

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Install ts-node:

```bash
npm install -D ts-node
```

Run seed:

```bash
npx prisma db seed
```

---

## Development Workflow

### Daily Development

```bash
# Start dev server
npm run dev

# In another terminal, watch Prisma Studio
npx prisma studio

# Make changes to schema
# Then create migration
npx prisma migrate dev --name add_new_field

# Generate Prisma Client (after schema changes)
npx prisma generate
```

### Adding New Features

1. **Create database models** in `prisma/schema.prisma`
2. **Run migration:** `npx prisma migrate dev`
3. **Create API route** in `app/api/[feature]/route.ts`
4. **Create page** in `app/(dashboard)/[feature]/page.tsx`
5. **Create components** in `components/[feature]/`
6. **Write tests** in `tests/`

### Code Quality

```bash
# Lint
npm run lint

# Format
npx prettier --write .

# Type check
npx tsc --noEmit

# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

---

## Deployment to Vercel

### First Deployment

1. **Push code to GitHub**

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Import project to Vercel**
   - Go to [vercel.com](https://vercel.com/)
   - Click "Import Project"
   - Select your GitHub repo
   - Configure:
     - Framework: Next.js
     - Build command: `npm run build`
     - Install command: `npm install`

3. **Add environment variables** in Vercel dashboard
   - Copy from `.env`
   - Paste into Vercel project settings

4. **Deploy**
   - Vercel will build and deploy
   - You'll get a URL like `https://income-tracker.vercel.app`

### Subsequent Deployments

```bash
# Just push to main branch
git push origin main

# Vercel automatically deploys
```

---

## Troubleshooting

### Prisma Issues

**Error: Can't reach database**
- Check `DATABASE_URL` is correct
- Ensure Supabase project is running
- Verify network connection

**Fix:**
```bash
npx prisma migrate reset
npx prisma migrate dev
```

### Clerk Issues

**Error: Clerk not initialized**
- Check API keys in `.env`
- Ensure `ClerkProvider` wraps app
- Verify middleware is configured

### Build Issues

**Error: Module not found**
```bash
# Clear cache
rm -rf .next
npm run build
```

**Error: Type errors**
```bash
# Regenerate Prisma Client
npx prisma generate

# Check TypeScript
npx tsc --noEmit
```

---

## Useful Commands

```bash
# Database
npx prisma studio                    # Open database GUI
npx prisma migrate dev               # Create migration
npx prisma migrate deploy            # Apply migrations (production)
npx prisma db push                   # Prototype schema changes
npx prisma generate                  # Generate Prisma Client

# Development
npm run dev                          # Start dev server
npm run build                        # Build for production
npm run start                        # Start production server
npm run lint                         # Run ESLint

# Testing
npm test                             # Run unit tests
npm run test:e2e                     # Run E2E tests
npm run test:coverage                # Run tests with coverage

# Code Quality
npx prettier --write .               # Format all files
npx eslint . --fix                   # Auto-fix lint issues

# Analysis
npx @next/bundle-analyzer            # Analyze bundle size
```

---

## Next Steps

After setting up, refer to:

1. **IMPLEMENTATION_PLAN.md** - Detailed feature implementation
2. **ARCHITECTURE.md** - Technical patterns and best practices
3. **Design docs** - Original product vision

Start with **Phase 0** in the implementation plan:
- Complete project setup
- Install all dependencies
- Configure development tools
- Set up testing infrastructure

Then move to **Phase 1**:
- Implement full Prisma schema
- Create core API routes
- Build foundation for features

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

**Happy coding! 🚀**
