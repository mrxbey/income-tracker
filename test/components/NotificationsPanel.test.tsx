import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NotificationsPanel } from '@/components/features/notifications/NotificationsPanel'

global.fetch = vi.fn()

describe('NotificationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state initially', () => {
    const mockFetch = vi.fn(() => new Promise(() => {})) // Never resolves
    global.fetch = mockFetch as any

    render(<NotificationsPanel />)

    expect(screen.getByText(/loading notifications/i)).toBeInTheDocument()
  })

  it('should display notifications after loading', async () => {
    const mockNotifications = {
      notifications: [
        {
          id: 'notif-1',
          type: 'BUDGET_ALERT',
          priority: 'HIGH',
          title: 'Budget Exceeded',
          message: 'Your groceries budget has been exceeded',
          actionUrl: '/budgets',
          actionText: 'View Budget',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      unreadCount: 1,
    }

    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockNotifications),
      })
    )

    global.fetch = mockFetch as any

    render(<NotificationsPanel />)

    await waitFor(() => {
      expect(screen.getByText('Budget Exceeded')).toBeInTheDocument()
      expect(screen.getByText(/your groceries budget has been exceeded/i)).toBeInTheDocument()
    })
  })

  it('should show empty state when no notifications', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            notifications: [],
            total: 0,
            unreadCount: 0,
          }),
      })
    )

    global.fetch = mockFetch as any

    render(<NotificationsPanel />)

    await waitFor(() => {
      expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument()
    })
  })

  it('should mark notification as read when clicked', async () => {
    const mockNotifications = {
      notifications: [
        {
          id: 'notif-1',
          type: 'BUDGET_ALERT',
          priority: 'HIGH',
          title: 'Budget Exceeded',
          message: 'Test message',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      unreadCount: 1,
    }

    let callCount = 0
    const mockFetch = vi.fn((_url: string, options?: any) => {
      callCount++

      // First call: GET notifications
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockNotifications),
        })
      }

      // Second call: PATCH to mark as read
      if (options?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
      }

      return Promise.resolve({ ok: true })
    })

    global.fetch = mockFetch as any

    render(<NotificationsPanel />)

    await waitFor(() => {
      expect(screen.getByText('Budget Exceeded')).toBeInTheDocument()
    })

    // Click mark as read button
    const markReadButton = screen.getByTitle('Mark as read')
    fireEvent.click(markReadButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/notifications/notif-1'),
        expect.objectContaining({ method: 'PATCH' })
      )
    })
  })

  it('should filter to unread only when toggle is clicked', async () => {
    const mockNotifications = {
      notifications: [],
      total: 0,
      unreadCount: 0,
    }

    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockNotifications),
      })
    )

    global.fetch = mockFetch as any

    render(<NotificationsPanel />)

    await waitFor(() => {
      expect(screen.getByText(/notifications/i)).toBeInTheDocument()
    })

    // Click unread only button
    const unreadButton = screen.getByText('Unread Only')
    fireEvent.click(unreadButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('unreadOnly=true'),
        undefined
      )
    })
  })

  it('should mark all as read when button is clicked', async () => {
    const mockNotifications = {
      notifications: [
        {
          id: 'notif-1',
          type: 'BUDGET_ALERT',
          priority: 'HIGH',
          title: 'Test',
          message: 'Test',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      unreadCount: 1,
    }

    let callCount = 0
    const mockFetch = vi.fn((_url: string, options?: any) => {
      callCount++

      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockNotifications),
        })
      }

      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, count: 1 }),
        })
      }

      return Promise.resolve({ ok: true })
    })

    global.fetch = mockFetch as any

    render(<NotificationsPanel />)

    await waitFor(() => {
      expect(screen.getByText(/test/i)).toBeInTheDocument()
    })

    const markAllButton = screen.getByText('Mark All Read')
    fireEvent.click(markAllButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/notifications'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('should display priority badges correctly', async () => {
    const mockNotifications = {
      notifications: [
        {
          id: 'notif-1',
          type: 'BUDGET_ALERT',
          priority: 'HIGH',
          title: 'High Priority',
          message: 'Test',
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'notif-2',
          type: 'SYSTEM',
          priority: 'LOW',
          title: 'Low Priority',
          message: 'Test',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 2,
      unreadCount: 2,
    }

    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockNotifications),
      })
    )

    global.fetch = mockFetch as any

    render(<NotificationsPanel />)

    await waitFor(() => {
      expect(screen.getByText('High')).toBeInTheDocument()
      expect(screen.getByText('Low')).toBeInTheDocument()
    })
  })
})
