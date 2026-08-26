'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled app error', error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[720px] flex-col items-start justify-center px-6">
      <p className="text-micro font-semibold uppercase tracking-[0.09em] text-destructive">
        Something broke
      </p>
      <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.015em]">
        The studio <em className="not-italic text-brand">hit a snag.</em>
      </h1>
      <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.55] text-muted-foreground">
        Try again — the error has been logged. If it keeps happening, head back
        to the studio.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[12px] text-muted-foreground">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to the studio</Link>
        </Button>
      </div>
    </div>
  )
}