'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExportDataDialog } from '@/components/features/export/ExportDataDialog'
import {
  FileBarChart,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Download,
  Printer,
  FileText,
} from 'lucide-react'

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reportType, setReportType] = useState<string>('monthly-summary')

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Generate financial reports and export your data
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <ExportDataDialog />
        </div>
      </div>

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Report Settings</CardTitle>
          <CardDescription>Configure your report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly-summary">Monthly Summary</SelectItem>
                  <SelectItem value="income-expense">Income vs Expenses</SelectItem>
                  <SelectItem value="category-breakdown">Category Breakdown</SelectItem>
                  <SelectItem value="net-worth">Net Worth Trend</SelectItem>
                  <SelectItem value="tax-summary">Tax Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income-expense">Income & Expenses</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="net-worth">Net Worth</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">$0.00</div>
                <p className="text-xs text-muted-foreground">For selected period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">$0.00</div>
                <p className="text-xs text-muted-foreground">For selected period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">$0.00</div>
                <p className="text-xs text-muted-foreground">Income - Expenses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Total count</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>
                {dateFrom && dateTo
                  ? `Report for ${dateFrom} to ${dateTo}`
                  : 'Select date range to generate report'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileBarChart className="mx-auto h-12 w-12 mb-4" />
                <p>Select dates and click "Generate Report" to view detailed analytics</p>
                <Button className="mt-4" disabled={!dateFrom || !dateTo}>
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income & Expenses Tab */}
        <TabsContent value="income-expense" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expenses</CardTitle>
              <CardDescription>Compare your income and expenses over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="mx-auto h-12 w-12 mb-4" />
                <p>Chart visualization will appear here</p>
                <p className="text-sm mt-2">
                  Select date range and generate report to view trends
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Spending distribution across categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-4" />
                <p>Category breakdown will appear here</p>
                <p className="text-sm mt-2">
                  Shows percentage and amount spent per category
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Spending Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Food & Dining', amount: '$0.00', percentage: 0 },
                  { name: 'Transportation', amount: '$0.00', percentage: 0 },
                  { name: 'Shopping', amount: '$0.00', percentage: 0 },
                  { name: 'Bills & Utilities', amount: '$0.00', percentage: 0 },
                  { name: 'Entertainment', amount: '$0.00', percentage: 0 },
                ].map((category, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {category.amount}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Net Worth Tab */}
        <TabsContent value="net-worth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Net Worth Over Time</CardTitle>
              <CardDescription>Track your net worth growth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="mx-auto h-12 w-12 mb-4" />
                <p>Net worth trend chart will appear here</p>
                <p className="text-sm mt-2">
                  Shows assets minus liabilities over time
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cash + Investments + Receivables
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Credit Cards + Loans
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Assets - Liabilities
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Download your financial data in various formats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="justify-start">
              <Download className="mr-2 h-4 w-4" />
              Export as CSV
            </Button>
            <Button variant="outline" className="justify-start">
              <Download className="mr-2 h-4 w-4" />
              Export as JSON
            </Button>
            <Button variant="outline" className="justify-start" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Note: PDF and Excel exports can be generated using the "Export Data" button above.
            Use your browser's "Print to PDF" feature for PDF reports.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
