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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Download, Loader2, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function CalendarExportDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [options, setOptions] = useState({
    includeSubscriptions: true,
    includeBills: true,
    includeGoals: true,
    includeBudgets: true,
    monthsAhead: '12',
  })

  const handleExport = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        subscriptions: String(options.includeSubscriptions),
        bills: String(options.includeBills),
        goals: String(options.includeGoals),
        budgets: String(options.includeBudgets),
        months: options.monthsAhead,
      })

      const response = await fetch(`/api/calendar/export?${params}`)

      if (!response.ok) {
        throw new Error('Failed to export calendar')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'financial-calendar.ics'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setOpen(false)
    } catch (err) {
      console.error('Error exporting calendar:', err)
      setError(err instanceof Error ? err.message : 'Failed to export calendar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          Export Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export to Calendar</DialogTitle>
          <DialogDescription>
            Download an iCal file to import into Google Calendar, Apple Calendar, or Outlook
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* Event types */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Include Events</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="subscriptions" className="cursor-pointer">
                  Subscription renewals
                </Label>
                <Switch
                  id="subscriptions"
                  checked={options.includeSubscriptions}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeSubscriptions: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="bills" className="cursor-pointer">
                  Bill due dates
                </Label>
                <Switch
                  id="bills"
                  checked={options.includeBills}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeBills: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="goals" className="cursor-pointer">
                  Goal deadlines
                </Label>
                <Switch
                  id="goals"
                  checked={options.includeGoals}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeGoals: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="budgets" className="cursor-pointer">
                  Budget review dates
                </Label>
                <Switch
                  id="budgets"
                  checked={options.includeBudgets}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeBudgets: checked }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Time range */}
          <div className="space-y-2">
            <Label htmlFor="months">Time Range</Label>
            <Select
              value={options.monthsAhead}
              onValueChange={(value) =>
                setOptions((prev) => ({ ...prev, monthsAhead: value }))
              }
            >
              <SelectTrigger id="months">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Next 3 months</SelectItem>
                <SelectItem value="6">Next 6 months</SelectItem>
                <SelectItem value="12">Next 12 months</SelectItem>
                <SelectItem value="24">Next 24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="text-sm font-semibold">How to use:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click "Export Calendar" below</li>
              <li>Open the downloaded .ics file</li>
              <li>Your calendar app will import the events</li>
              <li>Set up reminders as needed</li>
            </ol>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Quick Links:</h4>
            <div className="flex flex-col gap-2">
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Google Calendar
              </a>
              <a
                href="https://outlook.live.com/calendar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Outlook Calendar
              </a>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
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
                Export Calendar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
