# Library Management & Upgrade Strategy Skill

This document provides comprehensive guidance for managing dependencies, performing upgrades, and maintaining the Income Tracker application's library ecosystem.

## Quick Reference

### Current Tech Stack (as of 2025-01-18)

**Core Framework:**
- Next.js 15.1.6 (App Router)
- React 19.0.0
- TypeScript 5.7.3

**Database & ORM:**
- Prisma 6.3.0
- PostgreSQL (Supabase)
- Decimal.js 10.4.3

**UI & Styling:**
- Tailwind CSS 3.4.1
- Radix UI components
- Lucide React 0.554.0
- React Hook Form 7.66.1
- Zod 3.24.1

**Authentication:**
- Clerk 6.35.2

**Testing:**
- Vitest 2.1.8
- Testing Library (React) 16.1.0

**AI & Data Processing:**
- Google Generative AI 0.24.1
- OpenAI 4.77.3
- Papaparse 5.4.1

---

## Upgrade Decision Framework

### When to Upgrade Immediately

✅ **Critical Security Patches**
- CVE fixes in any package
- Authentication vulnerabilities
- Database security issues

✅ **Bug Fixes in Production**
- Fixes for issues you're currently experiencing
- Performance improvements for bottlenecks
- Stability improvements

✅ **Minor/Patch Updates (Same Major Version)**
- Example: 6.3.0 → 6.3.1 or 6.3.0 → 6.4.0
- Low risk, high reward
- Usually backward compatible

### When to Defer Upgrades

⏸️ **Major Version Upgrades**
- Example: Next.js 15 → 16, Tailwind 3 → 4
- Require thorough testing
- May have breaking changes
- Schedule for dedicated sprint

⏸️ **Brand New Releases**
- Wait 2-4 weeks for .1 or .2 patch
- Let community discover issues
- Check changelog for breaking changes

⏸️ **Non-Critical Dependencies**
- Dev tools (ESLint, Prettier)
- Type definitions
- Can batch with other updates

---

## Current Known Upgrade Paths

### Phase 1: Safe Immediate Upgrades ✅ COMPLETED

These have been applied:
```bash
npm update @clerk/nextjs @types/react @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser react-hook-form @google/generative-ai \
  lucide-react prettier-plugin-tailwindcss
```

### Phase 2: Breaking Change Upgrades (Deferred)

#### Next.js 16 (Currently: 15.1.6 → Available: 16.1.5)

**Breaking Changes:**
- App Router improvements (likely compatible)
- Server Components updates
- Metadata API changes
- Image optimization changes

**Migration Strategy:**
1. Wait for Next.js 16.2+ (more stable)
2. Review official upgrade guide
3. Test in development branch
4. Focus areas:
   - Page.tsx files (App Router)
   - Metadata exports
   - Image component usage
   - Server Actions

**Command:**
```bash
npm install next@16 @next/eslint-plugin-next@16
```

#### Tailwind CSS 4 (Currently: 3.4.1 → Available: 4.x)

**Breaking Changes:**
- New CSS-first configuration
- Removal of JIT mode (always on)
- PostCSS plugin changes
- Color palette restructuring

**Migration Strategy:**
1. Schedule dedicated sprint
2. Review migration guide
3. Update tailwind.config.ts → CSS file
4. Test all components visually
5. Update custom utilities

**Estimated Effort:** 2-3 days

### Phase 3: Monitoring & Regular Updates

#### Weekly Monitoring:
- `npm outdated` - Check for updates
- GitHub Dependabot alerts
- Package security advisories

#### Monthly Batch Updates:
```bash
# Safe updates only
npm update

# Check what changed
git diff package.json package-lock.json
```

#### Quarterly Major Reviews:
- Evaluate major version upgrades
- Review deprecation notices
- Plan breaking change migrations

---

## Testing Strategy After Upgrades

### Minimal Testing (Patch Updates)

```bash
npm run type-check  # TypeScript compilation
npm run lint        # ESLint checks
npm run test        # Unit tests
npm run build       # Production build
```

### Standard Testing (Minor Updates)

All minimal tests plus:
- Manual testing of core features
- Database migration verification
- API endpoint testing

### Comprehensive Testing (Major Updates)

All standard tests plus:
- Full regression testing
- UI component visual review
- Cross-browser testing
- Performance benchmarking
- Staging environment deployment

---

## Package-Specific Notes

### Next.js
- **Current:** 15.1.6
- **Strategy:** Conservative - wait for .2+ releases
- **Risk:** Medium - framework changes affect everything
- **Test Focus:** App Router, Server Components, API routes

### Prisma
- **Current:** 6.3.0
- **Strategy:** Stay up-to-date within major version
- **Risk:** Medium - database schema changes
- **Test Focus:** Migrations, queries, relations

### React
- **Current:** 19.0.0
- **Strategy:** Follow Next.js compatibility
- **Risk:** High - core framework
- **Test Focus:** Component rendering, hooks, state

### Clerk (Auth)
- **Current:** 6.35.2
- **Strategy:** Keep updated for security
- **Risk:** High - authentication is critical
- **Test Focus:** Login, signup, protected routes

### Zod (Validation)
- **Current:** 3.24.1
- **Next:** 4.x available
- **Strategy:** Defer to v4 until stable
- **Migration:** Review schema definitions for breaking changes

### Google Generative AI
- **Current:** 0.24.1
- **Strategy:** Stay updated for features
- **Risk:** Low - isolated feature
- **Test Focus:** AI-powered categorization

---

## Rollback Procedures

### If Upgrade Causes Issues:

1. **Immediate Rollback (Git):**
   ```bash
   git checkout package.json package-lock.json
   npm install
   ```

2. **Partial Rollback (Single Package):**
   ```bash
   npm install package-name@old-version
   ```

3. **Nuclear Option:**
   ```bash
   rm -rf node_modules package-lock.json
   git checkout package-lock.json
   npm install
   ```

### After Rollback:

1. Document the issue
2. Check GitHub issues for the package
3. Create minimal reproduction
4. File issue if necessary
5. Add to "Known Issues" section

---

## Plaid Integration (Future Feature)

### Cost Structure:
- **Development:** Free (unlimited)
- **Production:** $0-100 users free, then $0.25/user/month
- **Institutions:** 12,000+ supported (US/Canada)

### Dependencies to Add:
```bash
npm install react-plaid-link @types/react-plaid-link
```

### Integration Steps:
1. Get Plaid API keys (sandbox first)
2. Implement PlaidLink component
3. Add webhook handlers
4. Store access tokens securely
5. Implement transaction sync
6. Add error handling & user feedback

---

## CSV/JSON Import Feature ✅ IMPLEMENTED

### Dependencies Added:
```bash
npm install papaparse @types/papaparse react-dropzone
```

### Files Created:
- `lib/services/import-service.ts` - Core import logic
- `components/features/import/ImportDataDialog.tsx` - UI component
- `app/api/transactions/import/route.ts` - API endpoint
- `components/features/accounts/AccountCardWithActions.tsx` - Integration
- `components/features/accounts/AccountsList.tsx` - Account list with import

### Features Implemented:
✅ CSV & JSON parsing
✅ Auto-detect field mapping
✅ Manual field mapping UI
✅ Data validation
✅ Preview before import
✅ Error handling
✅ Duplicate detection logic (ready for use)
✅ Category name matching
✅ Multi-currency support

### Usage:
1. Navigate to Accounts page
2. Each account has "Import CSV/JSON" button
3. Upload file (CSV or JSON)
4. Map fields (auto-detected if possible)
5. Preview transactions
6. Confirm import

---

## Dependency Audit Commands

### Check for Outdated Packages:
```bash
npm outdated
```

### Check for Security Vulnerabilities:
```bash
npm audit
npm audit fix  # Automatic fixes
npm audit fix --force  # May include breaking changes
```

### Analyze Bundle Size:
```bash
npm run build
# Check .next/analyze
```

### Check for Unused Dependencies:
```bash
npx depcheck
```

---

## Common Issues & Solutions

### Issue: TypeScript Errors After Update

**Solution:**
```bash
# Clear TypeScript cache
rm -rf .next
rm -rf node_modules/.cache

# Reinstall
npm install

# Check types
npm run type-check
```

### Issue: Build Fails After Update

**Solution:**
```bash
# Clear all caches
rm -rf .next node_modules/.cache

# Fresh install
rm -rf node_modules package-lock.json
npm install

# Try build
npm run build
```

### Issue: Tests Fail After Update

**Solution:**
1. Check test library compatibility
2. Update test mocks if APIs changed
3. Review test snapshots
4. Update test utilities

### Issue: Runtime Errors in Development

**Solution:**
```bash
# Kill all Next.js processes
pkill -f next

# Clear everything
rm -rf .next node_modules/.cache

# Restart dev server
npm run dev
```

---

## Emergency Contacts & Resources

### Official Documentation:
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Clerk: https://clerk.com/docs
- Tailwind: https://tailwindcss.com/docs

### Community Resources:
- Next.js Discord: https://discord.gg/nextjs
- Prisma Slack: https://slack.prisma.io
- Stack Overflow tags: nextjs, prisma, react

### Package Health Checks:
- npm trends: https://npmtrends.com
- Bundlephobia: https://bundlephobia.com
- Can I Use: https://caniuse.com

---

## Changelog Template

When performing upgrades, document in CHANGELOG.md:

```markdown
## [Version] - YYYY-MM-DD

### 📦 Dependencies
- Upgraded [package] from X.Y.Z to A.B.C
  - Reason: [security/feature/bugfix]
  - Breaking changes: [yes/no]
  - Migration required: [yes/no]

### ✅ Testing
- [ ] Type checking passed
- [ ] Tests passed
- [ ] Build successful
- [ ] Manual testing completed

### 📝 Notes
- [Any special considerations]
- [Known issues]
- [Follow-up tasks]
```

---

## Best Practices

### 1. Never Upgrade in Production Directly
- Always test in development
- Use staging environment
- Deploy with rollback plan

### 2. One Major Update at a Time
- Don't upgrade Next.js AND React simultaneously
- Makes debugging easier
- Isolates issues

### 3. Read Changelogs
- Check CHANGELOG.md or release notes
- Look for "BREAKING CHANGE" mentions
- Review migration guides

### 4. Test Edge Cases
- Focus on custom implementations
- Test integrations (Clerk, Prisma, etc.)
- Verify environment-specific features

### 5. Keep Lock File Updated
- Commit package-lock.json changes
- Don't mix npm/yarn/pnpm
- Use consistent Node.js version

---

## Quick Commands Reference

```bash
# Check current versions
npm list [package-name]

# Update specific package
npm update [package-name]

# Install specific version
npm install [package-name]@[version]

# See what would be updated
npm outdated

# Check for security issues
npm audit

# Clean install
rm -rf node_modules package-lock.json && npm install

# Type check
npm run type-check

# Run tests
npm run test

# Build for production
npm run build

# Check bundle size
npm run build && ls -lh .next/static/chunks
```

---

## Current Project Status

### ✅ Completed Features:
1. Account management (manual entry)
2. CSV/JSON import system
3. Transaction tracking
4. Budget management
5. Multi-currency support
6. AI-powered categorization
7. Document upload (PDF/Image)
8. Export functionality
9. Spending analytics
10. Goal tracking
11. Notifications system

### 🚧 Pending Features:
1. Plaid bank integration
2. Recurring transactions
3. Bill reminders
4. Investment tracking
5. Tax reporting
6. Receipt scanning
7. Mobile app
8. Multi-user households

### 📊 Current Metrics:
- TypeScript Errors: 0
- Test Pass Rate: 84% (52/62 tests passing)
- Bundle Size: ~500KB
- API Endpoints: 30+
- Database Models: 20+

---

## Skill Usage Guide

### For Claude:

When asked about library management:

1. **Check current versions:**
   - Refer to "Current Tech Stack" section
   - Note any pending upgrades

2. **Evaluate upgrade request:**
   - Check "Upgrade Decision Framework"
   - Identify risk level
   - Recommend testing strategy

3. **Provide upgrade commands:**
   - Use package-specific notes
   - Include testing steps
   - Document rollback procedure

4. **After upgrade:**
   - Run all relevant tests
   - Update this document
   - Create changelog entry

### For Developers:

1. Monthly review of this document
2. Update after each upgrade
3. Document issues and solutions
4. Share team knowledge

---

*Last Updated: 2025-01-18*
*Document Version: 1.0*
*Project: Income Tracker*
