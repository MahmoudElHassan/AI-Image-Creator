import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[720px] flex-col items-start justify-center px-6">
      <p className="text-micro font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        404 · not in the studio
      </p>
      <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.015em]">
        This page is <em className="not-italic text-brand">not in the studio.</em>
      </h1>
      <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.55] text-muted-foreground">
        The URL you tried doesn’t match a brand, a key, or a generation we
        know about. Head back to the studio and try again.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/">Back to the studio</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/brands">Your brands</Link>
        </Button>
      </div>
    </div>
  )
}