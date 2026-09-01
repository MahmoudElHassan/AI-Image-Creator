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
  mapSupabaseBrandsError,
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
    .order('created_at', { ascending: false })

  if (error) {
    const mapped = mapSupabaseBrandsError(error)
    return jsonError(mapped.status, mapped.code, mapped.message, {
      operation: 'list_brands',
      supabaseCode: error.code,
      supabaseMessage: error.message,
      userId: auth.user.id,
    })
  }

  const rows = (data ?? []) as BrandRow[]
  const { statuses, error: kitError } = await loadKitStatuses(
    auth.supabase,
    rows.map((row) => row.id),
  )

  if (kitError) {
    console.warn('[api/brands] kit status enrichment skipped', {
      supabaseCode: kitError.code,
      supabaseMessage: kitError.message,
      brandCount: rows.length,
    })
  }

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
    const mapped = error ? mapSupabaseBrandsError(error) : null
    return jsonError(
      mapped?.status ?? 500,
      mapped?.code ?? 'UNKNOWN',
      mapped?.code === 'UNKNOWN' ? 'Failed to create brand' : mapped!.message,
      {
        operation: 'create_brand',
        supabaseCode: error?.code,
        supabaseMessage: error?.message,
        userId: auth.user.id,
      },
    )
  }

  return NextResponse.json(toBrand(data as BrandRow, 'not_started'), { status: 201 })
}
