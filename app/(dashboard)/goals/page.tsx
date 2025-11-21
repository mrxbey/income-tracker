import { GoalTracker } from '@/components/features/goals/GoalTracker'

export default function GoalsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financial Goals</h2>
          <p className="text-muted-foreground">Set and track your financial goals</p>
        </div>
      </div>
      <GoalTracker />
    </div>
  )
}
