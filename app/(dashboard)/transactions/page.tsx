import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">View and manage your income and expenses</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No transactions yet</CardTitle>
          <CardDescription>Add your first transaction or upload a statement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Track your spending and income by adding transactions manually or uploading bank statements.
            </p>
            <div className="flex gap-2">
              <Button variant="outline">Upload PDF</Button>
              <Button variant="outline">Upload Image</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
