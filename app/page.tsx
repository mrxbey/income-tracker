import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Income Tracker</h1>
        <p className="text-lg text-muted-foreground mb-8">
          AI-powered personal finance tracking with multi-region support
        </p>
        <div className="flex gap-4">
          <Link
            href="/sign-in"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 border border-input rounded-md hover:bg-accent"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  )
}
