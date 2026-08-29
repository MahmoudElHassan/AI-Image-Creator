import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthedSupabase,
  jsonError,
  proxyToBackend,
  shouldUseNativeApi,
} from '@/lib/api-route'
import { buildLogoUrl, loadOwnedBrandRow } from '@/lib/brand-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: { brandId: string } }

const MAX_BYTES = 5 * 1024 * 1024
const TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!shouldUseNativeApi()) {
    return proxyToBackend(request, `/brands/${params.brandId}/logo`)
  }

  const auth = await getAuthedSupabase(request)
  if ('response' in auth) return auth.response

  const brand = await loadOwnedBrandRow(auth.supabase, params.brandId, auth.user.id)
  if (!brand) return jsonError(404, 'BRAND_NOT_FOUND', 'Brand not found')

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return jsonError(400, 'VALIDATION_ERROR', 'A logo file is required')
  }
  if (file.size > MAX_BYTES) {
    return jsonError(400, 'VALIDATION_ERROR', 'File size exceeds 5 MB limit')
  }
  const ext = TYPES[file.type]
  if (!ext) {
    return jsonError(400, 'INVALID_FILE_TYPE', 'Only PNG, JPG, and WebP images are accepted')
  }

  const bucket = process.env.STORAGE_BUCKET?.trim() || 'brand-assets'
  const storagePath = `brands/${params.brandId}/logo.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await auth.supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, { contentType: file.type, upsert: true })
  if (uploadError) {
    return jsonError(500, 'UNKNOWN', 'Failed to upload logo')
  }

  const { data, error } = await auth.supabase
    .from('brands')
    .update({ logo_path: storagePath })
    .eq('id', params.brandId)
    .select('updated_at')
    .single()

  if (error || !data) {
    await auth.supabase.storage.from(bucket).remove([storagePath])
    return jsonError(500, 'UNKNOWN', 'Failed to save logo')
  }

  if (brand.logo_path && brand.logo_path !== storagePath) {
    await auth.supabase.storage.from(bucket).remove([brand.logo_path])
  }

  return NextResponse.json({
    logo_url: buildLogoUrl(storagePath, data.updated_at),
  })
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!shouldUseNativeApi()) {
    return proxyToBackend(request, `/brands/${params.brandId}/logo`)
  }

  const auth = await getAuthedSupabase(request)
  if ('response' in auth) return auth.response

  const brand = await loadOwnedBrandRow(auth.supabase, params.brandId, auth.user.id)
  if (!brand) return jsonError(404, 'BRAND_NOT_FOUND', 'Brand not found')
  if (!brand.logo_path) {
    return jsonError(404, 'LOGO_NOT_FOUND', 'Brand has no logo to delete')
  }

  const bucket = process.env.STORAGE_BUCKET?.trim() || 'brand-assets'
  await auth.supabase.storage.from(bucket).remove([brand.logo_path])
  await auth.supabase.from('brands').update({ logo_path: null }).eq('id', params.brandId)
  return new NextResponse(null, { status: 204 })
}
