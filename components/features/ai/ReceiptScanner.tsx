'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Camera, Upload, Loader2, Check, X, Sparkles } from 'lucide-react'
import { fileToBase64, validateReceiptImage } from '@/lib/ai/gemini-receipt-scanner'
import { formatCurrency } from '@/lib/utils'

interface ExtractedData {
  merchant: string
  date: string
  total: number
  currency: string
  items: Array<{
    name: string
    price: number
    quantity?: number
    category?: string
  }>
  taxAmount?: number
  tipAmount?: number
  paymentMethod?: string
  confidence: number
  suggestedCategory: string
  suggestedTags: string[]
}

interface ReceiptScannerProps {
  onDataExtracted: (data: ExtractedData) => void
}

export function ReceiptScanner({ onDataExtracted }: ReceiptScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateReceiptImage(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Scan receipt
    await scanReceipt(file)
  }

  const scanReceipt = async (file: File) => {
    setScanning(true)
    setError(null)

    try {
      const base64 = await fileToBase64(file)

      const response = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      })

      if (!response.ok) throw new Error('Failed to scan receipt')

      const data: ExtractedData = await response.json()
      setExtractedData(data)
    } catch (err) {
      setError('Failed to scan receipt. Please try again or enter manually.')
      console.error(err)
    } finally {
      setScanning(false)
    }
  }

  const handleAccept = () => {
    if (extractedData) {
      onDataExtracted(extractedData)
      // Reset state
      setPreview(null)
      setExtractedData(null)
      setError(null)
    }
  }

  const handleRetry = () => {
    setPreview(null)
    setExtractedData(null)
    setError(null)
    fileInputRef.current?.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Receipt Scanner
        </CardTitle>
        <CardDescription>
          Take a photo or upload a receipt image to automatically extract transaction details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload area */}
        {!preview && (
          <div>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              id="receipt-upload"
            />
            <Label
              htmlFor="receipt-upload"
              className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Click to upload or take photo</p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or WebP • Max 10MB
                  </p>
                </div>
              </div>
            </Label>
          </div>
        )}

        {/* Preview and scanning */}
        {preview && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg">
              <img
                src={preview}
                alt="Receipt preview"
                className="h-64 w-full object-contain bg-muted"
              />
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm font-medium">Scanning receipt...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Extracted data */}
            {extractedData && (
              <div className="space-y-4 rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Extracted Data</h3>
                  <Badge variant={extractedData.confidence >= 0.8 ? 'default' : 'secondary'}>
                    {Math.round(extractedData.confidence * 100)}% confident
                  </Badge>
                </div>

                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Merchant:</span>
                      <p className="font-medium">{extractedData.merchant}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <p className="font-medium">{extractedData.date}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <p className="font-medium text-lg">
                        {formatCurrency(extractedData.total, extractedData.currency)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payment:</span>
                      <p className="font-medium">{extractedData.paymentMethod || 'N/A'}</p>
                    </div>
                  </div>

                  {/* AI Suggestions */}
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Sparkles className="h-3 w-3" />
                      <span>AI Suggestions:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="default">{extractedData.suggestedCategory}</Badge>
                      {extractedData.suggestedTags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Line items */}
                  {extractedData.items.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Items ({extractedData.items.length}):</span>
                      <div className="mt-1 max-h-32 space-y-1 overflow-y-auto">
                        {extractedData.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-sm rounded bg-muted/50 px-2 py-1"
                          >
                            <span className="flex-1">
                              {item.quantity && item.quantity > 1 && `${item.quantity}x `}
                              {item.name}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(item.price, extractedData.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAccept} className="flex-1 gap-1">
                    <Check className="h-4 w-4" />
                    Use This Data
                  </Button>
                  <Button onClick={handleRetry} variant="outline" className="gap-1">
                    <X className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
                <Button onClick={handleRetry} variant="outline" size="sm" className="mt-2">
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
