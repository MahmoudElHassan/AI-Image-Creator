import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/lib/server-api-url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 130

export async function POST(
  request: NextRequest,
  { params }: { params: { brandId: string } },
) {
  const body = await request.text()

  const headers: Record<string, string> = {
    'Content-Type': request.headers.get('content-type') ?? 'application/json',
  }
  const auth = request.headers.get('authorization')
  if (auth) headers['Authorization'] = auth

  let upstream: Response
  try {
    upstream = await fetch(backendUrl(`/brands/${params.brandId}/generate`), {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(120_000),
    })
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    const status = isTimeout ? 504 : 502
    const code = isTimeout ? 'GATEWAY_TIMEOUT' : 'BACKEND_UNREACHABLE'
    const message = isTimeout
      ? 'The request took too long to complete. Please try again.'
      : 'Could not reach the generation service. Please try again.'
    return NextResponse.json(
      { error: { code, message, request_id: null } },
      { status },
    )
  }

  const responseBody = await upstream.text()
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('content-type') ?? 'application/json',
    },
  })
}
