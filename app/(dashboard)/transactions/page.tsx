import { OptimisticTransactions } from '@/components/features/transactions/OptimisticTransactions'
import { QuickFiltersBar } from '@/components/features/filters/QuickFiltersBar'
import { QuickAddButton } from '@/components/features/quick-add/QuickAddButton'
import { ImportDataDialog } from '@/components/features/import/ImportDataDialog'
import { ExportDataDialog } from '@/components/features/export/ExportDataDialog'
import { AICategorization } from '@/components/features/ai/AICategorization'
import { ReceiptScanner } from '@/components/features/ai/ReceiptScanner'
import { RecurringPatternDetector } from '@/components/features/ai/RecurringPatternDetector'
import { SpendingAlerts } from '@/components/features/ai/SpendingAlerts'

export default function TransactionsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">View and manage your income and expenses</p>
        </div>
        <div className="flex gap-2">
          <ImportDataDialog />
          <ExportDataDialog />
        </div>
      </div>

      {/* AI Features Toolbar */}
      <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          AI Tools:
        </div>
        <AICategorization />
        <ReceiptScanner />
        <RecurringPatternDetector />
        <SpendingAlerts />
      </div>

      <QuickFiltersBar />
      <OptimisticTransactions />
      <QuickAddButton />
    </div>
  )
}
