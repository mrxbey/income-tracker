import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExportDataDialog } from '@/components/features/export/ExportDataDialog'

global.fetch = vi.fn()
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('ExportDataDialog', () => {
  it('should render export dialog button', () => {
    render(<ExportDataDialog />)

    const button = screen.getByText('Export Data')
    expect(button).toBeInTheDocument()
  })

  it('should open dialog when button is clicked', async () => {
    render(<ExportDataDialog />)

    const button = screen.getByText('Export Data')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText(/Export your financial data/i)).toBeInTheDocument()
    })
  })

  it('should show different export types in select', async () => {
    render(<ExportDataDialog />)

    fireEvent.click(screen.getByText('Export Data'))

    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: /export type/i })
      expect(select).toBeInTheDocument()
    })
  })

  it('should trigger export when export button is clicked', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({
          'Content-Disposition': 'attachment; filename="export.csv"',
        }),
        blob: () => Promise.resolve(new Blob(['test data'])),
      })
    )

    global.fetch = mockFetch as any

    render(<ExportDataDialog />)

    // Open dialog
    fireEvent.click(screen.getByText('Export Data'))

    await waitFor(() => {
      const exportButtons = screen.queryAllByText('Export')
      if (exportButtons.length > 1) {
        fireEvent.click(exportButtons[1]!) // Second "Export" is the action button
      }
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  it('should show date filters for transactions export', async () => {
    render(<ExportDataDialog />)

    fireEvent.click(screen.getByText('Export Data'))

    await waitFor(() => {
      // Transactions is the default, should show date filters
      expect(screen.getByLabelText(/date from/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date to/i)).toBeInTheDocument()
    })
  })

  it('should show error message on export failure', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    )

    global.fetch = mockFetch as any

    render(<ExportDataDialog />)

    fireEvent.click(screen.getByText('Export Data'))

    await waitFor(() => {
      const exportButtons = screen.queryAllByText('Export')
      if (exportButtons.length > 1) {
        fireEvent.click(exportButtons[1]!)
      }
    })

    await waitFor(() => {
      expect(screen.getByText(/failed to export data/i)).toBeInTheDocument()
    })
  })
})
