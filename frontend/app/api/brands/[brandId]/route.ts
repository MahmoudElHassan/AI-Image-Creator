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
  loadOwnedBrandRow,
  toBrand,
  validateBrandName,
  type BrandRow,
} from '@/lib/brand-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: { brandId: string } }

export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!shouldUseNativeApi()) return proxyToBackend(request, `/brands/${params.brandId}`)

  const auth = await getAuthedSupabase(request)
  if ('response' in auth) return auth.response

  const row = await loadOwnedBrandRow(auth.supabase, params.brandId, auth.user.id)
  if (!row) return jsonError(404, 'BRAND_NOT_FOUND', 'Brand not found')

  const statuses = await loadKitStatuses(auth.supabase, [params.brandId])
  return NextResponse.json(toBrand(row, statuses[params.brandId] ?? 'not_started'))
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!shouldUseNativeApi()) return proxyToBackend(request, `/brands/${params.brandId}`)

  const auth = await getAuthedSupabase(request)
  if ('response' in auth) return auth.response

  const existing = await loadOwnedBrandRow(auth.supabase, params.brandId, auth.user.id)
  if (!existing) return jsonError(404, 'BRAND_NOT_FOUND', 'Brand not found')

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

  const statuses = await loadKitStatuses(auth.supabase, [params.brandId])
  const kitStatus = statuses[params.brandId] ?? 'not_started'
  if (name === existing.name) {
    return NextResponse.json(toBrand(existing, kitStatus))
  }

  const { data, error } = await auth.supabase
    .from('brands')
    .update({ name })
    .eq('id', params.brandId)
    .select('id, name, logo_path, created_at, updated_at')
    .single()

  if (error || !data) {
    if (isDuplicateBrandError(error)) {
      return jsonError(409, 'DUPLICATE_BRAND_NAME', 'A brand with this name already exists')
    }
    return jsonError(500, 'UNKNOWN', 'Failed to update brand')
  }

  return NextResponse.json(toBrand(data as BrandRow, kitStatus))
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!shouldUseNativeApi()) return proxyToBackend(request, `/brands/${params.brandId}`)

  const auth = await getAuthedSupabase(request)
  if ('response' in auth) return auth.response

  const existing = await loadOwnedBrandRow(auth.supabase, params.brandId, auth.user.id)
  if (!existing) return jsonError(404, 'BRAND_NOT_FOUND', 'Brand not found')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid request payload')
  }

  const confirmName =
    body && typeof body === 'object' && 'confirm_name' in body
      ? (body as { confirm_name: unknown }).confirm_name
      : undefined
  if (typeof confirmName !== 'string' || confirmName !== existing.name) {
    return jsonError(400, 'NAME_MISMATCH', 'Confirmation name does not match brand name')
  }

  const bucket = process.env.STORAGE_BUCKET?.trim() || 'brand-assets'
  const { data: generations } = await auth.supabase
    .from('generations')
    .select('image_path')
    .eq('brand_id', params.brandId)
    .not('image_path', 'is', null)

  const paths = [
    existing.logo_path,
    ...(generations ?? []).map((row) => row.image_path as string | null),
  ].filter((path): path is string => Boolean(path))

  if (paths.length > 0) {
    await auth.supabase.storage.from(bucket).remove(paths)
  }

  const { error } = await auth.supabase.from('brands').delete().eq('id', params.brandId)
  if (error) {
    return jsonError(500, 'UNKNOWN', 'Failed to delete brand')
  }

  return new NextResponse(null, { status: 204 })
}
