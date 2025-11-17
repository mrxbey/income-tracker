# Income Tracker

> **AI-powered personal finance tracking with multi-region support**

A comprehensive personal finance application that provides intelligent tracking, forecasting, and analytics for your financial life across multiple regions (TR/UK) with AI-assisted data ingestion.

---

## Features

### Core Financial Management
- **Net Worth Tracking** - Real-time calculation with historical trends
- **Multi-Region Support** - Separate tracking for TR, UK, and other regions
- **Multi-Currency** - Automatic FX conversion with daily rate updates
- **Account Management** - Bank accounts, credit cards, loans, investments, cash
- **Transaction Tracking** - Comprehensive income and expense tracking

### Credit Card Analytics
- **Interest & Fees Tracking** - See exactly how much you're paying in interest
- **Installment Management** - Track "taksitler" with future payment schedules
- **Spend by Tags** - Categorize spending by clothing, food, subscriptions, etc.
- **Utilization Monitoring** - Track credit utilization across all cards
- **Payoff Simulator** - Compare minimum vs. aggressive payment strategies

### Recurring Costs & Income
- **Flexible Periods** - Weekly, monthly, quarterly, yearly, or custom intervals
- **Life Costs (Sabit Giderler)** - Therapy, cleaning, rent, utilities, subscriptions
- **Regional Breakdown** - See TR vs UK monthly costs separately
- **Income Sources** - Salary, freelance, rental income with variability

### AI-Powered Features
- **Document Processing** - Upload PDFs/images, extract transactions with Gemini 2.5
- **Smart Tagging** - AI suggests categories and tags with confidence scores
- **Learning System** - Creates classification rules, never asks same question twice
- **Review Queue** - Review low-confidence extractions before committing
- **Natural Language Q&A** - Ask questions like "How much did I spend on clothing this year?"

### Forecasting & Predictions
- **Net Worth Forecasting** - 5 and 12-month predictions using Holt-Winters
- **Cash Flow Overlay** - Includes recurring costs, income, and installments
- **Scenario Planning** - "What if rent increases 20%?" simulations
- **Confidence Bands** - Upper and lower bounds on predictions

### Powerful Tagging
- **Flexible Tags** - Create any tags you want (kıyafet, market, yemek, etc.)
- **Tag Analytics** - Spending by tag, per card, per region, over time
- **Classification Rules** - Auto-tag based on merchant patterns
- **Bulk Operations** - Tag multiple transactions at once

---

## Tech Stack

### Frontend
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components
- **Recharts** - Data visualization

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - Type-safe ORM
- **Supabase** - PostgreSQL database + file storage
- **Clerk** - Authentication & user management

### AI & ML
- **Gemini 2.5** - Document processing with structured output
- **OpenAI GPT-4** - Natural language Q&A via Vercel AI SDK
- **Holt-Winters** - Time series forecasting

### DevOps
- **Vercel** - Deployment & hosting
- **GitHub Actions** - CI/CD
- **Sentry** - Error tracking
- **Vitest** - Unit testing
- **Playwright** - E2E testing

---

## Documentation

- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - Detailed implementation plan with phases
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and best practices
- **[QUICK_START.md](./QUICK_START.md)** - Get started quickly

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Supabase account
- Clerk account
- Gemini API key
- OpenAI API key

### Quick Setup

```bash
# Clone repository
git clone https://github.com/yourusername/income-tracker.git
cd income-tracker

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Set up database
npx prisma generate
npx prisma migrate dev

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

For detailed setup instructions, see **[QUICK_START.md](./QUICK_START.md)**

---

## Project Structure

```
income-tracker/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── dashboard/         # Dashboard components
│   ├── cards/             # Card analytics components
│   └── ...
├── lib/                   # Utilities and business logic
│   ├── prisma.ts          # Database client
│   ├── ai/                # AI integrations
│   ├── forecast/          # Forecasting algorithms
│   └── currency/          # FX conversion
├── prisma/                # Database schema and migrations
├── tests/                 # Test files
└── public/                # Static assets
```

---

## Key Concepts

### Multi-Region Architecture

Every account belongs to a region (TR, UK, etc.):
```typescript
{
  name: "YKB Account",
  countryCode: "TR",
  regionGroup: "TR",
  currency: "TRY"
}
```

This enables:
- Separate P&L for TR vs UK
- Regional net worth calculations
- Per-region recurring costs
- Multi-currency with FX conversion

### AI Document Processing

Upload a PDF bank statement:
1. Gemini 2.5 extracts transactions with structured output
2. AI suggests category and tags with confidence scores
3. Low-confidence items go to review queue
4. You review, adjust, and optionally create rules
5. Next time, similar transactions auto-classify

### Installment Tracking

Credit card installments (taksitler) are first-class:
```typescript
{
  totalAmount: 6000,         // Total purchase
  numInstallments: 6,        // 6 months
  installmentAmount: 1000,   // Monthly payment
  firstDueAt: "2025-01-15",
  frequencyDays: 30
}
```

These feed into:
- Card analytics (monthly obligations)
- Net worth forecasts (future payments)
- Cash flow predictions

### Smart Tagging

Tag classification rules learn from your actions:
```typescript
{
  pattern: "ZARA",
  patternType: "MERCHANT_CONTAINS",
  tagIds: ["kıyafet"],
  categoryId: "shopping.clothing"
}
```

Once created, all future "ZARA" transactions auto-tag as "kıyafet" without asking.

---

## Development Workflow

### Adding a New Feature

1. **Update database schema** (`prisma/schema.prisma`)
2. **Create migration** (`npx prisma migrate dev --name feature_name`)
3. **Create API route** (`app/api/feature/route.ts`)
4. **Create service** (`lib/services/feature-service.ts`)
5. **Create page** (`app/(dashboard)/feature/page.tsx`)
6. **Create components** (`components/feature/`)
7. **Write tests** (`tests/unit/`, `tests/e2e/`)

### Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npx prettier --write .

# Type check
npx tsc --noEmit
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

Vercel automatically:
- Runs `npm run build`
- Applies database migrations
- Deploys to edge network
- Runs cron jobs

### Environment Variables

Required for production:
```bash
DATABASE_URL=                    # Supabase connection string
DIRECT_URL=                      # Direct connection for migrations
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
GOOGLE_GEMINI_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_KEY=
CRON_SECRET=
```

See `.env.example` for complete list.

---

## Roadmap

### Phase 1: MVP (Weeks 1-3) ✅
- [x] Project setup
- [x] Core data models
- [x] Basic dashboard
- [x] Accounts & transactions
- [x] Manual entry

### Phase 2: Advanced Features (Weeks 4-7)
- [ ] Credit card analytics
- [ ] Installments
- [ ] Recurring costs & income
- [ ] Multi-region analytics
- [ ] Tagging system

### Phase 3: AI Integration (Weeks 8-9)
- [ ] Gemini 2.5 document processing
- [ ] Review queue
- [ ] Classification rules
- [ ] Learning system

### Phase 4: Forecasting (Week 10)
- [ ] Net worth snapshots
- [ ] Holt-Winters implementation
- [ ] Cash flow overlay
- [ ] Scenario builder

### Phase 5: AI Q&A (Week 11)
- [ ] OpenAI integration
- [ ] Chat interface
- [ ] Pre-built questions
- [ ] Streaming responses

### Phase 6: Polish (Weeks 12-14)
- [ ] Testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Production deployment

### Future Enhancements
- [ ] Bank API integrations (direct sync)
- [ ] Mobile app (React Native)
- [ ] Budget alerts
- [ ] Goal tracking
- [ ] Investment portfolio tracking
- [ ] Tax reporting

---

## Contributing

This is a personal project, but contributions are welcome!

### Guidelines

1. Follow TypeScript strict mode
2. Write tests for new features
3. Use conventional commits
4. Update documentation

### Development

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, commit
git commit -m "feat: add awesome feature"

# Push and create PR
git push origin feature/my-feature
```

---

## License

MIT License - see [LICENSE](./LICENSE) for details

---

## Support

For questions or issues:
- Open an issue on GitHub
- Check [QUICK_START.md](./QUICK_START.md) for setup help
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details

---

## Acknowledgments

- **Design Inspiration**: Personal finance pain points
- **Tech Stack**: Next.js, Prisma, Supabase, Clerk
- **AI**: Google Gemini 2.5, OpenAI GPT-4
- **UI**: shadcn/ui, Tailwind CSS

---

**Built with ❤️ and TypeScript**
