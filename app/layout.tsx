import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Validate environment variables at startup
import '@/lib/env'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Income Tracker - AI-Powered Personal Finance',
  description:
    'Track your income, expenses, and net worth across multiple regions with AI-assisted data entry and intelligent forecasting.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
