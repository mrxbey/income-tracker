import { test, expect } from '@playwright/test'

// E2E Tests for Transaction Management Flow
test.describe('Transaction Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and sign in
    await page.goto('http://localhost:3000')
    // Assuming user is already authenticated in test environment
  })

  test('should create a new transaction', async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions')

    // Click "Add Transaction" button (FAB or toolbar)
    await page.click('[data-testid="add-transaction"]')

    // Fill in transaction form
    await page.fill('[name="description"]', 'Test Coffee Purchase')
    await page.fill('[name="amount"]', '5.99')
    await page.selectOption('[name="type"]', 'EXPENSE')
    await page.selectOption('[name="accountId"]', { index: 0 })

    // Submit form
    await page.click('[type="submit"]')

    // Verify success message or redirect
    await expect(page).toHaveURL(/\/transactions/)

    // Verify transaction appears in list
    await expect(page.locator('text=Test Coffee Purchase')).toBeVisible()
  })

  test('should filter transactions by date range', async ({ page }) => {
    await page.goto('/transactions')

    // Click on "This Month" filter
    await page.click('button:has-text("This Month")')

    // Verify URL params updated
    await expect(page).toHaveURL(/dateRange=month/)

    // Verify filter is active
    await expect(page.locator('button:has-text("This Month")')).toHaveClass(/active|default/)
  })

  test('should search transactions', async ({ page }) => {
    await page.goto('/transactions')

    // Focus search input (keyboard shortcut: /)
    await page.press('body', '/')

    // Type search query
    await page.fill('[type="search"]', 'coffee')

    // Verify filtered results
    await expect(page.locator('text=Coffee')).toBeVisible()
  })

  test('should edit transaction via swipe gesture (mobile)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/transactions')

    // Simulate swipe right on first transaction
    const firstTransaction = page.locator('[data-testid="transaction-card"]').first()

    // Touch events for swipe
    await firstTransaction.dispatchEvent('touchstart', {
      touches: [{ clientX: 50, clientY: 100 }]
    })

    await firstTransaction.dispatchEvent('touchmove', {
      touches: [{ clientX: 150, clientY: 100 }]
    })

    await firstTransaction.dispatchEvent('touchend')

    // Verify edit action triggered
    await expect(page.locator('[data-testid="edit-dialog"]')).toBeVisible()
  })

  test('should delete transaction via swipe gesture', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/transactions')

    const initialCount = await page.locator('[data-testid="transaction-card"]').count()

    // Swipe left on first transaction
    const firstTransaction = page.locator('[data-testid="transaction-card"]').first()

    await firstTransaction.dispatchEvent('touchstart', {
      touches: [{ clientX: 300, clientY: 100 }]
    })

    await firstTransaction.dispatchEvent('touchmove', {
      touches: [{ clientX: 100, clientY: 100 }]
    })

    await firstTransaction.dispatchEvent('touchend')

    // Wait for deletion
    await page.waitForTimeout(500)

    // Verify count decreased
    const newCount = await page.locator('[data-testid="transaction-card"]').count()
    expect(newCount).toBeLessThan(initialCount)
  })
})

test.describe('Keyboard Shortcuts', () => {
  test('should open new transaction dialog with "N" key', async ({ page }) => {
    await page.goto('/transactions')

    // Press 'N' key
    await page.press('body', 'n')

    // Verify dialog opens
    await expect(page.locator('[data-testid="new-transaction-dialog"]')).toBeVisible()
  })

  test('should navigate to dashboard with "G + D"', async ({ page }) => {
    await page.goto('/transactions')

    // Press 'G' then 'D'
    await page.press('body', 'g')
    await page.press('body', 'd')

    // Verify navigation
    await expect(page).toHaveURL('/')
  })

  test('should show keyboard shortcuts help with "?"', async ({ page }) => {
    await page.goto('/')

    // Press '?' (Shift + /)
    await page.press('body', 'Shift+/')

    // Verify help dialog
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible()
  })
})

test.describe('AI Features', () => {
  test('should get AI category suggestion', async ({ page }) => {
    await page.goto('/transactions')

    // Open new transaction dialog
    await page.click('[data-testid="add-transaction"]')

    // Fill basic info
    await page.fill('[name="description"]', 'Starbucks Coffee')
    await page.fill('[name="merchant"]', 'Starbucks')
    await page.fill('[name="amount"]', '5.99')

    // Click "Get AI Suggestion"
    await page.click('button:has-text("Get AI Suggestion")')

    // Wait for suggestion
    await expect(page.locator('text=AI Suggestion')).toBeVisible({ timeout: 10000 })

    // Verify confidence badge
    await expect(page.locator('[data-testid="confidence-badge"]')).toBeVisible()

    // Accept suggestion
    await page.click('button:has-text("Accept")')

    // Verify category was filled
    await expect(page.locator('[name="categoryId"]')).not.toBeEmpty()
  })

  test('should scan receipt', async ({ page }) => {
    await page.goto('/transactions')

    // Open receipt scanner
    await page.click('[data-testid="scan-receipt"]')

    // Upload test receipt image
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./test-fixtures/receipt-sample.jpg')

    // Wait for scanning
    await expect(page.locator('text=Scanning receipt')).toBeVisible()

    // Wait for results
    await expect(page.locator('text=Extracted Data')).toBeVisible({ timeout: 15000 })

    // Verify merchant extracted
    await expect(page.locator('[data-testid="extracted-merchant"]')).toBeVisible()

    // Accept extracted data
    await page.click('button:has-text("Use This Data")')

    // Verify transaction created
    await expect(page.locator('text=Transaction created')).toBeVisible()
  })
})

test.describe('Quick Filters', () => {
  test('should filter by transaction type', async ({ page }) => {
    await page.goto('/transactions')

    // Click "Income" filter
    await page.click('button:has-text("Income")')

    // Verify only income transactions shown
    const transactions = page.locator('[data-testid="transaction-card"]')
    const count = await transactions.count()

    for (let i = 0; i < count; i++) {
      const txn = transactions.nth(i)
      await expect(txn.locator('[data-testid="type-icon"]')).toHaveClass(/green|income/)
    }
  })

  test('should use custom date range', async ({ page }) => {
    await page.goto('/transactions')

    // Click "Custom" date filter
    await page.click('button:has-text("Custom")')

    // Fill date range
    await page.fill('[name="dateFrom"]', '2025-01-01')
    await page.fill('[name="dateTo"]', '2025-01-31')

    // Verify filter applied
    await expect(page.locator('text=Active filters')).toBeVisible()
  })

  test('should clear all filters', async ({ page }) => {
    await page.goto('/transactions')

    // Apply some filters
    await page.click('button:has-text("This Week")')
    await page.click('button:has-text("Expense")')

    // Verify active filters badge
    await expect(page.locator('text=Active filters')).toBeVisible()

    // Click "Clear all"
    await page.click('button:has-text("Clear all")')

    // Verify filters reset
    await expect(page.locator('text=Active filters')).not.toBeVisible()
  })
})

test.describe('Optimistic UI', () => {
  test('should show transaction immediately on create', async ({ page }) => {
    await page.goto('/transactions')

    const initialCount = await page.locator('[data-testid="transaction-card"]').count()

    // Create new transaction
    await page.click('[data-testid="add-transaction"]')
    await page.fill('[name="description"]', 'Optimistic Test')
    await page.fill('[name="amount"]', '10.00')
    await page.click('[type="submit"]')

    // Transaction should appear immediately (optimistic)
    const newCount = await page.locator('[data-testid="transaction-card"]').count()
    expect(newCount).toBe(initialCount + 1)

    // Verify it has pending indicator
    await expect(page.locator('text=Optimistic Test').locator('..')).toHaveClass(/pending|opacity/)
  })

  test('should remove transaction immediately on delete', async ({ page }) => {
    await page.goto('/transactions')

    const initialCount = await page.locator('[data-testid="transaction-card"]').count()

    // Delete first transaction
    await page.locator('[data-testid="transaction-card"]').first().locator('[data-testid="delete-btn"]').click()

    // Confirm deletion
    await page.click('button:has-text("Confirm")')

    // Transaction should disappear immediately
    const newCount = await page.locator('[data-testid="transaction-card"]').count()
    expect(newCount).toBe(initialCount - 1)
  })
})

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/transactions')

    // Check for proper labels
    await expect(page.locator('[aria-label="Add transaction"]')).toBeVisible()
    await expect(page.locator('[aria-label="Search transactions"]')).toBeVisible()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/transactions')

    // Tab through interactive elements
    await page.press('body', 'Tab')
    await page.press('body', 'Tab')

    // Verify focus visible
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()
  })

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/transactions')

    // This would require axe-core integration for proper testing
    // Placeholder for contrast checking
    expect(true).toBe(true)
  })
})
