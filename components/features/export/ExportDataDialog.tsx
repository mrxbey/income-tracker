'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Loader2, AlertCircle, FileDown } from 'lucide-react'
import { format } from 'date-fns'

type ExportType = 'transactions' | 'budget' | 'networth' | 'categories'
type ExportFormat = 'CSV' | 'JSON'

export function ExportDataDialog() {
  const [open, setOpen] = useState(false)
  const [exportType, setExportType] = useState<ExportType>('transactions')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('CSV')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [daysBack, setDaysBack] = useState('90')
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    try {
      setLoading(true)
      setError(null)

      let url = ''
      const params = new URLSearchParams()

      switch (exportType) {
        case 'transactions':
          url = '/api/export/transactions'
          params.append('format', exportFormat)
          if (dateFrom) params.append('dateFrom', dateFrom)
          if (dateTo) params.append('dateTo', dateTo)
          break

        case 'budget':
          url = '/api/export/budget'
          if (month) params.append('month', month)
          break

        case 'networth':
          url = '/api/export/networth'
          if (daysBack) params.append('daysBack', daysBack)
          break

        case 'categories':
          url = '/api/export/categories'
          if (dateFrom) params.append('dateFrom', dateFrom)
          if (dateTo) params.append('dateTo', dateTo)
          break
      }

      const fullUrl = `${url}?${params.toString()}`
      const response = await fetch(fullUrl)

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || `export-${Date.now()}.csv`

      // Download file
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      // Close dialog after successful export
      setOpen(false)
    } catch (err) {
      console.error('Export error:', err)
      setError(err instanceof Error ? err.message : 'Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setDateFrom('')
    setDateTo('')
    setDaysBack('90')
    setMonth(format(new Date(), 'yyyy-MM'))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileDown className="mr-2 h-5 w-5" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Export your financial data in various formats for backup or analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Export Type */}
          <div className="space-y-2">
            <Label htmlFor="export-type">Export Type</Label>
            <Select
              value={exportType}
              onValueChange={(value) => {
                setExportType(value as ExportType)
                resetFilters()
              }}
            >
              <SelectTrigger id="export-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transactions">Transactions</SelectItem>
                <SelectItem value="budget">Budget Summary</SelectItem>
                <SelectItem value="networth">Net Worth History</SelectItem>
                <SelectItem value="categories">Category Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Format Selection (only for transactions) */}
          {exportType === 'transactions' && (
            <div className="space-y-2">
              <Label htmlFor="export-format">Format</Label>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                <SelectTrigger id="export-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSV">CSV</SelectItem>
                  <SelectItem value="JSON">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filters based on export type */}
          {(exportType === 'transactions' || exportType === 'categories') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-from">Date From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-to">Date To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {exportType === 'budget' && (
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          )}

          {exportType === 'networth' && (
            <div className="space-y-2">
              <Label htmlFor="days-back">Days Back</Label>
              <Input
                id="days-back"
                type="number"
                value={daysBack}
                onChange={(e) => setDaysBack(e.target.value)}
                placeholder="90"
                min="1"
                max="365"
              />
            </div>
          )}

          {/* Export Info */}
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            {exportType === 'transactions' && (
              <p>
                Export your transactions as {exportFormat} format
                {dateFrom || dateTo ? ' for the selected date range' : ''}.
              </p>
            )}
            {exportType === 'budget' && (
              <p>Export budget summary for {month || 'current month'} as CSV.</p>
            )}
            {exportType === 'networth' && (
              <p>Export net worth history for the last {daysBack} days as CSV.</p>
            )}
            {exportType === 'categories' && (
              <p>
                Export category-wise spending summary as CSV
                {dateFrom || dateTo ? ' for the selected date range' : ''}.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
