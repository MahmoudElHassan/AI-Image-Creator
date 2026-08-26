import { Suspense } from 'react'
import { HistoryClient } from './history-client'

export default function HistoryPage({
  params,
}: {
  params: { brandId: string }
}) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <HistoryClient params={params} />
    </Suspense>
  )
}