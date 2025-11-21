'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { MobileSidebar } from './mobile-sidebar'

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMobileMenuClick={() => setMobileMenuOpen(true)} />
        <main id="main-content" className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
