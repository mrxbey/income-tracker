import Papa from 'papaparse'
import { TxnType } from '@prisma/client'

export interface ImportRow {
  date: string
  amount: string
  description: string
  merchant?: string
  type?: string
  category?: string
  currency?: string
}

export interface ParsedTransaction {
  postedAt: Date
  amount: number
  description: string
  merchant: string | null
  type: TxnType
  currency: string
  categoryName?: string
  raw: ImportRow
}

export interface ImportResult {
  success: boolean
  data?: ParsedTransaction[]
  errors?: string[]
  totalRows: number
  validRows: number
  invalidRows: number
}

export interface FieldMapping {
  date: string
  amount: string
  description: string
  merchant?: string
  type?: string
  category?: string
  currency?: string
}

/**
 * Parse CSV file content
 */
export async function parseCSV(fileContent: string): Promise<{
  headers: string[]
  rows: Record<string, string>[]
  errors: string[]
}> {
  return new Promise((resolve) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      complete: (results) => {
        const headers = results.meta.fields || []
        const rows = results.data as Record<string, string>[]
        const errors = results.errors.map((err) => err.message)

        resolve({ headers, rows, errors })
      },
      error: (error: Error) => {
        resolve({ headers: [], rows: [], errors: [error.message] })
      },
    })
  })
}

/**
 * Parse JSON file content
 */
export async function parseJSON(fileContent: string): Promise<{
  headers: string[]
  rows: Record<string, string>[]
  errors: string[]
}> {
  try {
    const data = JSON.parse(fileContent)

    if (!Array.isArray(data)) {
      return {
        headers: [],
        rows: [],
        errors: ['JSON file must contain an array of transactions'],
      }
    }

    if (data.length === 0) {
      return {
        headers: [],
        rows: [],
        errors: ['JSON file is empty'],
      }
    }

    // Extract headers from first object
    const headers = Object.keys(data[0] as object)

    // Convert all values to strings
    const rows = data.map((row) => {
      const stringRow: Record<string, string> = {}
      for (const key in row) {
        stringRow[key] = String(row[key])
      }
      return stringRow
    })

    return { headers, rows, errors: [] }
  } catch (error) {
    return {
      headers: [],
      rows: [],
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
    }
  }
}

/**
 * Map raw row data to standardized ImportRow
 */
function mapRowData(
  row: Record<string, string>,
  mapping: FieldMapping
): ImportRow {
  return {
    date: row[mapping.date] || '',
    amount: row[mapping.amount] || '',
    description: row[mapping.description] || '',
    merchant: mapping.merchant ? row[mapping.merchant] : undefined,
    type: mapping.type ? row[mapping.type] : undefined,
    category: mapping.category ? row[mapping.category] : undefined,
    currency: mapping.currency ? row[mapping.currency] : undefined,
  }
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  // Try ISO format first
  const isoDate = new Date(dateStr)
  if (!isNaN(isoDate.getTime())) {
    return isoDate
  }

  // Try common date formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,   // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,   // DD-MM-YYYY or MM-DD-YYYY
  ]

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      const [, p1, p2, p3] = match
      // Try as MM/DD/YYYY first
      const date1 = new Date(`${p1}/${p2}/${p3}`)
      if (!isNaN(date1.getTime())) {
        return date1
      }
      // Try as DD/MM/YYYY
      const date2 = new Date(`${p2}/${p1}/${p3}`)
      if (!isNaN(date2.getTime())) {
        return date2
      }
    }
  }

  return null
}

/**
 * Parse amount - handle negative numbers, currency symbols, etc.
 */
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null

  // Remove currency symbols and whitespace
  const cleaned = amountStr
    .replace(/[$€£¥₺,\s]/g, '')
    .replace(/[()]/g, '') // Remove parentheses
    .trim()

  const amount = parseFloat(cleaned)
  return isNaN(amount) ? null : amount
}

/**
 * Determine transaction type from various inputs
 */
function parseType(
  typeStr: string | undefined,
  amount: number
): TxnType {
  if (!typeStr) {
    // If no type specified, infer from amount
    return amount >= 0 ? TxnType.INCOME : TxnType.EXPENSE
  }

  const normalized = typeStr.toLowerCase().trim()

  // Common income keywords
  if (
    normalized === 'income' ||
    normalized === 'credit' ||
    normalized === 'deposit' ||
    normalized === 'revenue'
  ) {
    return TxnType.INCOME
  }

  // Common expense keywords
  if (
    normalized === 'expense' ||
    normalized === 'debit' ||
    normalized === 'payment' ||
    normalized === 'withdrawal'
  ) {
    return TxnType.EXPENSE
  }

  // Default: infer from amount
  return amount >= 0 ? TxnType.INCOME : TxnType.EXPENSE
}

/**
 * Validate and transform imported data
 */
export function validateAndTransform(
  rows: Record<string, string>[],
  mapping: FieldMapping,
  defaultCurrency: string = 'USD'
): ImportResult {
  const errors: string[] = []
  const validTransactions: ParsedTransaction[] = []
  let invalidRows = 0

  rows.forEach((row, index) => {
    const rowNum = index + 1
    const importRow = mapRowData(row, mapping)

    // Validate required fields
    if (!importRow.date) {
      errors.push(`Row ${rowNum}: Missing date`)
      invalidRows++
      return
    }

    if (!importRow.amount) {
      errors.push(`Row ${rowNum}: Missing amount`)
      invalidRows++
      return
    }

    if (!importRow.description) {
      errors.push(`Row ${rowNum}: Missing description`)
      invalidRows++
      return
    }

    // Parse date
    const postedAt = parseDate(importRow.date)
    if (!postedAt) {
      errors.push(`Row ${rowNum}: Invalid date format "${importRow.date}"`)
      invalidRows++
      return
    }

    // Parse amount
    const amount = parseAmount(importRow.amount)
    if (amount === null) {
      errors.push(`Row ${rowNum}: Invalid amount "${importRow.amount}"`)
      invalidRows++
      return
    }

    // Determine type
    const type = parseType(importRow.type, amount)

    // For expenses, ensure amount is negative
    const normalizedAmount = type === TxnType.EXPENSE && amount > 0 ? -amount : amount

    // Build valid transaction
    validTransactions.push({
      postedAt,
      amount: normalizedAmount,
      description: importRow.description,
      merchant: importRow.merchant || null,
      type,
      currency: importRow.currency || defaultCurrency,
      categoryName: importRow.category,
      raw: importRow,
    })
  })

  return {
    success: errors.length === 0,
    data: validTransactions,
    errors: errors.length > 0 ? errors : undefined,
    totalRows: rows.length,
    validRows: validTransactions.length,
    invalidRows,
  }
}

/**
 * Detect duplicate transactions
 */
export function detectDuplicates(
  newTransactions: ParsedTransaction[],
  existingTransactions: Array<{
    postedAt: Date
    amount: number
    description: string
  }>
): {
  duplicates: ParsedTransaction[]
  unique: ParsedTransaction[]
} {
  const duplicates: ParsedTransaction[] = []
  const unique: ParsedTransaction[] = []

  for (const newTxn of newTransactions) {
    const isDuplicate = existingTransactions.some((existing) => {
      // Consider duplicate if date, amount, and description match
      const sameDate =
        existing.postedAt.toISOString().split('T')[0] ===
        newTxn.postedAt.toISOString().split('T')[0]
      const sameAmount = Math.abs(existing.amount - newTxn.amount) < 0.01
      const sameDesc = existing.description.toLowerCase() === newTxn.description.toLowerCase()

      return sameDate && sameAmount && sameDesc
    })

    if (isDuplicate) {
      duplicates.push(newTxn)
    } else {
      unique.push(newTxn)
    }
  }

  return { duplicates, unique }
}

/**
 * Auto-detect field mapping based on common header patterns
 */
export function autoDetectMapping(headers: string[]): Partial<FieldMapping> {
  const mapping: Partial<FieldMapping> = {}

  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim())

  // Date detection
  const datePatterns = ['date', 'posted', 'transaction date', 'txn date', 'datetime']
  for (const pattern of datePatterns) {
    const index = normalizedHeaders.findIndex((h) => h.includes(pattern))
    if (index !== -1) {
      mapping.date = headers[index]
      break
    }
  }

  // Amount detection
  const amountPatterns = ['amount', 'value', 'total', 'sum', 'price']
  for (const pattern of amountPatterns) {
    const index = normalizedHeaders.findIndex((h) => h.includes(pattern))
    if (index !== -1) {
      mapping.amount = headers[index]
      break
    }
  }

  // Description detection
  const descPatterns = ['description', 'desc', 'memo', 'note', 'details', 'narration']
  for (const pattern of descPatterns) {
    const index = normalizedHeaders.findIndex((h) => h.includes(pattern))
    if (index !== -1) {
      mapping.description = headers[index]
      break
    }
  }

  // Merchant detection
  const merchantPatterns = ['merchant', 'vendor', 'payee', 'store', 'shop']
  for (const pattern of merchantPatterns) {
    const index = normalizedHeaders.findIndex((h) => h.includes(pattern))
    if (index !== -1) {
      mapping.merchant = headers[index]
      break
    }
  }

  // Type detection
  const typePatterns = ['type', 'transaction type', 'txn type']
  for (const pattern of typePatterns) {
    const index = normalizedHeaders.findIndex((h) => h === pattern)
    if (index !== -1) {
      mapping.type = headers[index]
      break
    }
  }

  // Category detection
  const categoryPatterns = ['category', 'cat', 'classification']
  for (const pattern of categoryPatterns) {
    const index = normalizedHeaders.findIndex((h) => h.includes(pattern))
    if (index !== -1) {
      mapping.category = headers[index]
      break
    }
  }

  // Currency detection
  const currencyPatterns = ['currency', 'cur', 'ccy']
  for (const pattern of currencyPatterns) {
    const index = normalizedHeaders.findIndex((h) => h === pattern)
    if (index !== -1) {
      mapping.currency = headers[index]
      break
    }
  }

  return mapping
}
