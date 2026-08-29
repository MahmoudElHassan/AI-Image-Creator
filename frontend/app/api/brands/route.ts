import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthedSupabase,
  jsonError,
  proxyToBackend,
  shouldUseNativeApi,
} from '@/lib/api-route'
import {
  isDuplicateBrandError,
  loadKitStatuses,
  toBrand,
  toBrandListItem,
  validateBrandName,
  type BrandRow,
} from '@/lib/brand-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!shouldUseNativeApi()) return proxyToBackend(request, '/brands')

  const auth = await getAuthedSupabase(request)
  if ('response' in auth) return auth.response

  const { data, error } = await auth.supabase
    .from('brands')
    .select('id, name, logo_path, created_at, updated_at')
    .eq('owner_user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return jsonError(500, 'UNKNOWN', 'Failed to load brands')
  }

  const rows = (data ?? []) as BrandRow[]
  const statuses = await loadKitStatuses(
    auth.supabase,
    rows.map((row) => row.id),
  )
  return NextResponse.json(
    rows.map((row) => toBrandListItem(row, statuses[row.id] ?? 'not_started')),
  )
}

export async function POST(request: NextRequest) {
  if (!shouldUseNativeApi()) return proxyToBackend(request, '/brands')

  const auth = await getAuthedSupabase(request)
  if ('response' in auth) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid request payload')
  }

  const name = validateBrandName(
    body && typeof body === 'object' && 'name' in body
      ? (body as { name: unknown }).name
      : undefined,
  )
  if (typeof name !== 'string') {
    return jsonError(400, 'VALIDATION_ERROR', name.error)
  }

  const { data, error } = await auth.supabase
    .from('brands')
    .insert({ owner_user_id: auth.user.id, name })
    .select('id, name, logo_path, created_at, updated_at')
    .single()

  if (error || !data) {
    if (isDuplicateBrandError(error)) {
      return jsonError(409, 'DUPLICATE_BRAND_NAME', 'A brand with this name already exists')
    }
    return jsonError(500, 'UNKNOWN', 'Failed to create brand')
  }

  return NextResponse.json(toBrand(data as BrandRow, 'not_started'), { status: 201 })
}
