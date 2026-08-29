import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/api-route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 130

export async function POST(
  request: NextRequest,
  { params }: { params: { brandId: string } },
) {
  return proxyToBackend(request, `/brands/${params.brandId}/generate`, 120_000)
}
