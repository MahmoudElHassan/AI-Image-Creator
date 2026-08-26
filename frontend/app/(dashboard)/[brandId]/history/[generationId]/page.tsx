import { Suspense } from 'react'
import { GenerationDetailClient } from './generation-detail-client'

export default function GenerationDetailPage({
  params,
}: {
  params: { brandId: string; generationId: string }
}) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <GenerationDetailClient params={params} />
    </Suspense>
  )
}