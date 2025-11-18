'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  Download,
} from 'lucide-react'
import {
  parseCSV,
  parseJSON,
  validateAndTransform,
  autoDetectMapping,
  type FieldMapping,
  type ParsedTransaction,
} from '@/lib/services/import-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ImportDataDialogProps {
  accountId: string
  defaultCurrency?: string
  onImportComplete?: (count: number) => void
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing'

export function ImportDataDialog({
  accountId,
  defaultCurrency = 'USD',
  onImportComplete,
}: ImportDataDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<ImportStep>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // File data
  const [fileName, setFileName] = useState<string>('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])

  // Field mapping
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({
    date: '',
    amount: '',
    description: '',
  })

  // Parsed transactions
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])
  const [validCount, setValidCount] = useState(0)
  const [invalidCount, setInvalidCount] = useState(0)
  const [parseErrors, setParseErrors] = useState<string[]>([])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]!
    setFileName(file.name)
    setLoading(true)
    setError(null)

    try {
      const content = await file.text()
      const isCSV = file.name.toLowerCase().endsWith('.csv')
      const isJSON = file.name.toLowerCase().endsWith('.json')

      if (!isCSV && !isJSON) {
        throw new Error('Only CSV and JSON files are supported')
      }

      const result = isCSV ? await parseCSV(content) : await parseJSON(content)

      if (result.errors.length > 0) {
        setError(result.errors.join(', '))
        return
      }

      if (result.rows.length === 0) {
        setError('File is empty or has no valid data')
        return
      }

      setHeaders(result.headers)
      setRawRows(result.rows)

      // Auto-detect field mapping
      const detectedMapping = autoDetectMapping(result.headers)
      setFieldMapping({
        date: detectedMapping.date || '',
        amount: detectedMapping.amount || '',
        description: detectedMapping.description || '',
        merchant: detectedMapping.merchant,
        type: detectedMapping.type,
        category: detectedMapping.category,
        currency: detectedMapping.currency,
      })

      setStep('mapping')
    } catch (err) {
      console.error('Error parsing file:', err)
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setLoading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
    multiple: false,
  })

  const handleValidate = () => {
    if (!fieldMapping.date || !fieldMapping.amount || !fieldMapping.description) {
      setError('Please map all required fields (Date, Amount, Description)')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = validateAndTransform(rawRows, fieldMapping, defaultCurrency)

      if (!result.success && result.errors) {
        setParseErrors(result.errors)
        setError(`Found ${result.errors.length} validation errors`)
      }

      setParsedTransactions(result.data || [])
      setValidCount(result.validRows)
      setInvalidCount(result.invalidRows)
      setStep('preview')
    } catch (err) {
      console.error('Error validating data:', err)
      setError(err instanceof Error ? err.message : 'Failed to validate data')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (parsedTransactions.length === 0) {
      setError('No valid transactions to import')
      return
    }

    setLoading(true)
    setError(null)
    setStep('importing')

    try {
      // Prepare transactions for API
      const transactionsToImport = parsedTransactions.map((txn) => ({
        accountId,
        postedAt: txn.postedAt.toISOString(),
        amount: txn.amount,
        currency: txn.currency,
        description: txn.description,
        merchant: txn.merchant,
        type: txn.type,
        categoryName: txn.categoryName,
        source: 'MANUAL',
      }))

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          transactions: transactionsToImport,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to import transactions')
      }

      const result = await response.json()

      // Success!
      setOpen(false)
      resetState()
      onImportComplete?.(result.imported)
    } catch (err) {
      console.error('Error importing transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to import transactions')
      setStep('preview') // Go back to preview on error
    } finally {
      setLoading(false)
    }
  }

  const resetState = () => {
    setStep('upload')
    setFileName('')
    setHeaders([])
    setRawRows([])
    setFieldMapping({ date: '', amount: '', description: '' })
    setParsedTransactions([])
    setValidCount(0)
    setInvalidCount(0)
    setParseErrors([])
    setError(null)
    setLoading(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetState()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV/JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
          <DialogDescription>
            Import transactions from CSV or JSON files
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center space-y-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                  </p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: CSV, JSON (max 10MB)
                </p>
              </div>
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Required columns:</strong> Date, Amount, Description
                <br />
                <strong>Optional columns:</strong> Merchant, Type, Category, Currency
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: Field Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                File loaded: <strong>{fileName}</strong> ({rawRows.length} rows)
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <p className="text-sm font-semibold">Map your file columns to transaction fields:</p>

              {/* Required fields */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-field">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={fieldMapping.date}
                    onValueChange={(value) =>
                      setFieldMapping((prev) => ({ ...prev, date: value }))
                    }
                  >
                    <SelectTrigger id="date-field">
                      <SelectValue placeholder="Select date column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount-field">
                    Amount <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={fieldMapping.amount}
                    onValueChange={(value) =>
                      setFieldMapping((prev) => ({ ...prev, amount: value }))
                    }
                  >
                    <SelectTrigger id="amount-field">
                      <SelectValue placeholder="Select amount column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description-field">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={fieldMapping.description}
                    onValueChange={(value) =>
                      setFieldMapping((prev) => ({ ...prev, description: value }))
                    }
                  >
                    <SelectTrigger id="description-field">
                      <SelectValue placeholder="Select description column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Optional fields */}
                <div className="space-y-2">
                  <Label htmlFor="merchant-field">Merchant (Optional)</Label>
                  <Select
                    value={fieldMapping.merchant || ''}
                    onValueChange={(value) =>
                      setFieldMapping((prev) => ({ ...prev, merchant: value || undefined }))
                    }
                  >
                    <SelectTrigger id="merchant-field">
                      <SelectValue placeholder="Select merchant column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleValidate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Validate & Preview
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <Alert variant={invalidCount > 0 ? 'destructive' : 'default'}>
              <Check className="h-4 w-4" />
              <AlertDescription>
                <strong>Valid transactions:</strong> {validCount}
                {invalidCount > 0 && (
                  <>
                    {' '}
                    | <strong className="text-destructive">Invalid:</strong> {invalidCount}
                  </>
                )}
              </AlertDescription>
            </Alert>

            {parseErrors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Validation Errors</CardTitle>
                  <CardDescription>
                    The following rows have errors and will be skipped:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[150px] overflow-y-auto">
                    <ul className="space-y-1 text-sm">
                      {parseErrors.slice(0, 10).map((err, i) => (
                        <li key={i} className="text-destructive">
                          • {err}
                        </li>
                      ))}
                      {parseErrors.length > 10 && (
                        <li className="text-muted-foreground">
                          ... and {parseErrors.length - 10} more
                        </li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview (first 5 transactions)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] overflow-y-auto">
                  <div className="space-y-2">
                    {parsedTransactions.slice(0, 5).map((txn, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md border p-2 text-sm"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{txn.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {txn.postedAt.toLocaleDateString()}
                            {txn.merchant && ` • ${txn.merchant}`}
                          </div>
                        </div>
                        <div
                          className={`font-semibold ${
                            txn.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {txn.amount >= 0 ? '+' : ''}
                          {txn.currency} {txn.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={loading || validCount === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Import {validCount} Transaction{validCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-semibold">Importing transactions...</p>
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
