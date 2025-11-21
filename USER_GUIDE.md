# Income Tracker - User Guide

> Comprehensive guide to using Income Tracker for personal finance management

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Accounts Management](#accounts-management)
4. [Transaction Management](#transaction-management)
5. [Categories and Tags](#categories-and-tags)
6. [Budgeting](#budgeting)
7. [Goals](#goals)
8. [Reports](#reports)
9. [Bank Connections](#bank-connections)
10. [Advanced Features](#advanced-features)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Creating Your Account

1. Visit the Income Tracker homepage
2. Click "Sign Up" in the top right
3. Choose your sign-up method:
   - Email and password
   - Google account
   - GitHub account
4. Verify your email address
5. Complete your profile setup

### Initial Setup

After creating your account:

1. **Set Your Base Currency**: Choose your primary currency (TRY, USD, GBP, etc.)
2. **Add Your First Account**: Start with your primary bank account or credit card
3. **Create Categories**: Set up expense and income categories
4. **Add Tags**: Create tags for detailed expense tracking (optional)

---

## Dashboard Overview

The dashboard provides a quick overview of your financial health:

### Key Metrics

- **Total Balance**: Sum of all account balances
- **Monthly Income**: Income received this month
- **Monthly Expenses**: Expenses made this month
- **Net Savings**: Income minus expenses
- **Budget Status**: Progress on active budgets

### Recent Activity

- Latest transactions across all accounts
- Upcoming fixed expenses
- Budget alerts and warnings
- Goal progress updates

### Quick Actions

- Add transaction
- Create budget
- Upload document
- View reports

---

## Accounts Management

### Account Types

Income Tracker supports various account types:

- **Deposit Accounts**: Checking and savings accounts
- **Credit Cards**: Credit card accounts with installment tracking
- **Loans**: Personal loans, mortgages, car loans
- **Investments**: Investment accounts and portfolios
- **Cash**: Physical cash tracking
- **Receivables**: Money owed to you
- **Other**: Other account types

### Adding an Account

1. Navigate to **Accounts** page
2. Click **"Add Account"**
3. Fill in account details:
   - Account name (e.g., "YKB Checking")
   - Account type
   - Currency
   - Country code (TR, GB, US, etc.)
   - Region group (for multi-region tracking)
   - Initial balance
   - Institution (optional)
4. Click **"Create Account"**

### Managing Accounts

- **Edit**: Update account name, balance, or status
- **Deactivate**: Temporarily hide account from views
- **Delete**: Permanently remove account (will also delete transactions)
- **Sync**: Connect to bank via Plaid for automatic updates

---

## Transaction Management

### Adding Transactions Manually

1. Click **"Add Transaction"** button
2. Select account
3. Enter transaction details:
   - Date (when transaction occurred)
   - Amount (positive for income, negative for expense)
   - Description
   - Merchant (optional)
   - Type (Income, Expense, Transfer, Fee, Interest)
   - Category
4. Add tags (optional)
5. Click **"Create Transaction"**

### Importing Transactions

#### Via Bank Connection (Plaid)
1. Go to **Bank Connections**
2. Click **"Connect Bank"**
3. Select your bank from the list
4. Log in securely through Plaid
5. Select accounts to connect
6. Transactions will sync automatically

#### Via Document Upload
1. Go to **Documents** → **"Upload"**
2. Select PDF or image file (bank statement, receipt, invoice)
3. Wait for AI processing
4. Review extracted transactions
5. Confirm or edit as needed
6. Transactions will be created

### Bulk Operations

Perform actions on multiple transactions at once:

1. Select transactions (checkbox on left)
2. Click **"Bulk Actions"** button
3. Choose operation:
   - **Delete**: Remove selected transactions
   - **Categorize**: Assign category to all
   - **Tag**: Add or remove tags
4. Confirm action
5. Changes apply to up to 100 transactions atomically

**Note**: Bulk operations are rate-limited to 10 requests per minute.

### Filtering and Searching

- **By Date Range**: Select start and end dates
- **By Account**: Show transactions from specific account
- **By Type**: Filter by Income, Expense, Transfer, etc.
- **By Category**: Show only specific category
- **By Tags**: Filter by one or more tags
- **By Merchant**: Search by merchant name
- **By Amount**: Filter by amount range

---

## Categories and Tags

### Understanding the Difference

- **Categories**: Hierarchical classification (Food → Restaurants)
- **Tags**: Flexible labels (clothing, subscription, business expense)

Use categories for broad classification and tags for detailed tracking.

### Creating Categories

1. Go to **Categories** page
2. Click **"Add Category"**
3. Enter category details:
   - Name (e.g., "Groceries")
   - Type (Income or Expense)
   - Parent category (for subcategories)
   - Icon and color (optional)
4. Click **"Create"**

### Creating Tags

1. Go to **Tags** page
2. Click **"Add Tag"**
3. Enter tag details:
   - Name (e.g., "clothing")
   - Slug (auto-generated from name)
   - Color (optional)
4. Click **"Create"**

### Auto-Tagging Rules

Create rules to automatically tag transactions:

1. Go to **Tags** → **"Rules"**
2. Click **"Create Rule"**
3. Configure rule:
   - Pattern (merchant name or description)
   - Pattern type (Contains, Equals, Regex)
   - Tags to apply
   - Category to assign (optional)
   - Priority (higher priority rules run first)
4. Click **"Save"**

**Example Rule**:
- Pattern: "ZARA"
- Type: "Merchant Contains"
- Tags: ["clothing", "shopping"]
- Category: "Shopping → Clothing"

All future transactions containing "ZARA" will auto-tag.

---

## Budgeting

### Creating a Budget

1. Go to **Budgets** page
2. Click **"Create Budget"**
3. Enter budget details:
   - Category (what you're budgeting for)
   - Amount (budget limit)
   - Currency
   - Period (Weekly, Monthly, Quarterly, Yearly)
   - Start date
   - End date (optional, leave blank for ongoing)
4. Click **"Create"**

### Budget Statuses

- **Not Started** (0%): No spending yet
- **On Track** (<80%): Spending within limits
- **Warning** (80-99%): Approaching limit
- **Exceeded** (≥100%): Over budget

### Budget Alerts

Receive notifications when:
- Budget reaches 80% (Warning)
- Budget reaches 90% (Critical)
- Budget exceeded (Alert)

### Budget Analytics

View budget performance:
- **Progress Bar**: Visual spending indicator
- **Remaining**: Amount left to spend
- **Days Remaining**: Days left in period
- **Average Daily Spending**: Your spending rate
- **Projected Spending**: Estimated end-of-period total
- **At Risk**: Prediction if you'll exceed budget

---

## Goals

### Creating Financial Goals

1. Go to **Goals** page
2. Click **"Create Goal"**
3. Enter goal details:
   - Name (e.g., "Emergency Fund")
   - Description (optional)
   - Target amount
   - Current amount (starting point)
   - Currency
   - Target date (optional)
   - Linked account (optional)
4. Click **"Create"**

### Tracking Goals

- **Progress Bar**: Visual progress indicator
- **Amount Needed**: Remaining amount to reach goal
- **Days Until Target**: Time remaining
- **Recommended Monthly Contribution**: To reach goal on time

### Updating Goal Progress

1. Navigate to goal details
2. Click **"Update Progress"**
3. Enter new current amount
4. Add note (optional)
5. Click **"Save"**

---

## Reports

### Available Report Types

1. **Monthly Summary**: Overview of income, expenses, and savings
2. **Income vs Expenses**: Comparative analysis over time
3. **Category Breakdown**: Spending distribution by category
4. **Net Worth Trend**: Assets minus liabilities over time
5. **Tax Summary**: Tax-relevant transactions

### Generating Reports

1. Go to **Reports** page
2. Select **Report Type** from dropdown
3. Choose **Date Range** (From and To dates)
4. Click **"Generate Report"**
5. View results in tabs:
   - Overview
   - Income & Expenses
   - Categories
   - Net Worth

### Exporting Reports

Export options:
- **Print**: Use browser's print function (Ctrl+P / ⌘+P)
- **PDF**: Print to PDF for saving
- **CSV**: Export raw data for Excel/Sheets
- **JSON**: Export structured data for further processing

---

## Bank Connections

### Connecting Your Bank (Plaid Integration)

**Supported Regions**: US, Canada, UK, and many European countries

1. Go to **Bank Connections** page
2. Click **"Connect Bank"**
3. Search for your bank
4. Click on your bank's logo
5. Log in with your bank credentials (secure via Plaid)
6. Select accounts to connect
7. Grant permissions
8. Wait for initial sync (may take a few minutes)

### Managing Connections

- **Sync Now**: Manually trigger sync
- **Reconnect**: Fix broken connections
- **Disconnect**: Remove bank connection
- **View Accounts**: See connected accounts

### Automatic Syncing

Connected accounts sync automatically:
- **Daily**: At midnight in your timezone
- **On-Demand**: Click "Sync Now" anytime

---

## Advanced Features

### Command Palette (⌘K)

Quick navigation using keyboard:

1. Press **⌘K** (Mac) or **Ctrl+K** (Windows/Linux)
2. Type to search:
   - Pages (Dashboard, Transactions, Reports, etc.)
   - Accounts
   - Recent transactions
3. Use arrow keys to navigate
4. Press **Enter** to open
5. Press **Escape** to close

### Fixed Expenses

Track recurring monthly costs:

1. Go to **Fixed Expenses**
2. Click **"Add Fixed Expense"**
3. Enter details:
   - Name (e.g., "Rent", "Therapy", "Internet")
   - Amount
   - Period (Weekly, Monthly, etc.)
   - Next due date
   - Account (where it's paid from)
   - Category
   - Life domain (Housing, Health, Utilities, etc.)
4. Click **"Create"**

These appear in forecasts and cash flow predictions.

### Income Sources

Track recurring income:

1. Go to **Income Sources**
2. Click **"Add Income Source"**
3. Enter details:
   - Name (e.g., "Salary", "Freelance", "Rental Income")
   - Amount
   - Period
   - Next expected date
   - Variability (0-100%, how much it fluctuates)
   - Account (where it's received)
   - Category
4. Click **"Create"**

### Installment Plans

Track credit card installments (taksitler):

1. Go to **Installments** page
2. Click **"Create Plan"**
3. Enter details:
   - Credit card account
   - Merchant
   - Total amount
   - Number of installments
   - Installment amount
   - First payment date
   - Frequency (usually 30 days)
4. Click **"Create"**

View:
- Remaining installments
- Monthly obligations
- Total remaining balance
- Payment schedule

---

## Keyboard Shortcuts

### Global

- **⌘K / Ctrl+K**: Open command palette
- **⌘N / Ctrl+N**: New transaction
- **⌘, / Ctrl+,**: Settings
- **Escape**: Close dialogs

### Navigation

- **G then D**: Go to Dashboard
- **G then T**: Go to Transactions
- **G then A**: Go to Accounts
- **G then B**: Go to Budgets
- **G then R**: Go to Reports

### Transaction List

- **J / ↓**: Next transaction
- **K / ↑**: Previous transaction
- **Space**: Select/deselect transaction
- **Shift+Space**: Select range
- **Delete**: Delete selected

### Command Palette

- **↓ / ↑**: Navigate results
- **Enter**: Open selected
- **Escape**: Close palette

---

## Troubleshooting

### Transactions Not Syncing

1. Check bank connection status
2. Click "Reconnect" if disconnected
3. Verify bank credentials are correct
4. Check if bank is undergoing maintenance
5. Try manual sync: Click "Sync Now"

### Budget Not Updating

1. Verify transactions are properly categorized
2. Check date range matches budget period
3. Ensure budget is marked as "Active"
4. Refresh the page

### Categories Not Showing

1. Check category type (Income vs Expense)
2. Verify category is not deleted
3. Refresh categories list
4. Create new category if needed

### Export Not Working

1. Check browser popup blocker
2. Try different export format
3. Reduce date range
4. Try from different browser

### Bank Connection Failed

1. Verify credentials are correct
2. Check if bank supports Plaid
3. Try incognito/private mode
4. Contact support if persistent

### Performance Issues

1. Clear browser cache
2. Reduce date range in reports
3. Archive old transactions
4. Check internet connection
5. Try different browser

---

## FAQ

### Is my financial data secure?

Yes! Income Tracker uses industry-standard security:
- All connections encrypted (HTTPS/SSL)
- Bank credentials never stored (handled by Plaid)
- Data encrypted at rest
- Regular security audits
- SOC 2 Type II compliant hosting (Supabase)

### Can I use multiple currencies?

Yes! Each account has its own currency. The dashboard shows totals in your base currency with automatic conversion.

### How do I delete my account?

Go to Settings → Account → Delete Account. This permanently removes all your data.

### Can I export all my data?

Yes! Go to Settings → Data → Export Data. Choose format (CSV or JSON) and download.

### Is there a mobile app?

Currently web-only, but the site is mobile-responsive. Native mobile apps are planned for the future.

### How accurate is the AI document processing?

AI extraction is 85-95% accurate. Always review extracted transactions before confirming, especially for:
- Handwritten receipts
- Poor quality scans
- Foreign language documents

### Can I share access with family?

Not currently. Each account is single-user. Family accounts are planned for future releases.

### What banks are supported?

10,000+ banks via Plaid in US, Canada, UK, and Europe. Check [plaid.com](https://plaid.com/institutions) for your bank.

---

## Support

Need help?

- **Documentation**: Check this guide and README.md
- **Issues**: Report bugs on GitHub
- **Email**: support@example.com
- **Community**: Join discussions on GitHub Discussions

---

## Tips & Best Practices

### For Accurate Tracking

1. **Categorize consistently**: Use the same categories for similar expenses
2. **Tag generously**: Tags help with detailed analysis
3. **Review weekly**: Spend 10 minutes weekly reviewing transactions
4. **Use rules**: Create auto-tagging rules to save time
5. **Sync regularly**: Keep bank connections active and syncing

### For Better Budgeting

1. **Start conservative**: Set realistic budgets you can meet
2. **Track progress daily**: Quick checks keep you aware
3. **Adjust as needed**: Budgets aren't set in stone
4. **Use subcategories**: Break large budgets into smaller ones
5. **Plan for irregular expenses**: Annual fees, subscriptions, gifts

### For Financial Health

1. **Track net worth monthly**: Take snapshots regularly
2. **Set specific goals**: "Save $5000" vs "Save more"
3. **Review spending patterns**: Monthly category breakdowns
4. **Plan ahead**: Use forecasting for big purchases
5. **Stay consistent**: Regular tracking = better insights

---

**Happy tracking! 💰📊**
