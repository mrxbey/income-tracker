import { BudgetDashboard } from '@/components/features/budget/BudgetDashboard'

export default function BudgetsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Budgets</h2>
          <p className="text-muted-foreground">Track and manage your spending budgets</p>
        </div>
      </div>
      <BudgetDashboard />
    </div>
  )
}
