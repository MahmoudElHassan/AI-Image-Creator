import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/api-route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: { path: string[] } }

async function handle(request: NextRequest, { params }: RouteContext) {
  return proxyToBackend(request, `/${params.path.join('/')}`)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const HEAD = handle
