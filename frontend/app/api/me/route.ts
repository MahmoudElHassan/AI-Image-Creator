import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthedSupabase,
  jsonError,
  proxyToBackend,
  shouldUseNativeApi,
} from '@/lib/api-route'
import { isAdminEmail } from '@/lib/is-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!shouldUseNativeApi()) return proxyToBackend(request, '/me')

  const auth = await getAuthedSupabase(request)
  if ('response' in auth) return auth.response

  const { data, error } = await auth.supabase
    .from('profiles')
    .select('*')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error || !data) {
    return jsonError(404, 'PROFILE_NOT_FOUND', 'Profile not found')
  }

  return NextResponse.json({
    user_id: data.user_id,
    email: auth.user.email ?? '',
    full_name: data.full_name ?? null,
    avatar_url: data.avatar_url ?? null,
    is_admin: isAdminEmail(auth.user.email),
    created_at: data.created_at,
    updated_at: data.updated_at,
  })
}

export async function PATCH(request: NextRequest) {
  if (!shouldUseNativeApi()) return proxyToBackend(request, '/me')

  const auth = await getAuthedSupabase(request)
  if ('response' in auth) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid request payload')
  }

  if (!body || typeof body !== 'object') {
    return jsonError(400, 'VALIDATION_ERROR', 'No fields provided for update')
  }

  const incoming = body as { full_name?: unknown; avatar_url?: unknown }
  const update: Record<string, string | null> = {}
  if ('full_name' in incoming) {
    update.full_name =
      incoming.full_name == null ? null : String(incoming.full_name)
  }
  if ('avatar_url' in incoming) {
    update.avatar_url =
      incoming.avatar_url == null ? null : String(incoming.avatar_url)
  }
  if (Object.keys(update).length === 0) {
    return jsonError(400, 'VALIDATION_ERROR', 'No fields provided for update')
  }

  const { data, error } = await auth.supabase
    .from('profiles')
    .update(update)
    .eq('user_id', auth.user.id)
    .select('*')
    .single()

  if (error || !data) {
    return jsonError(404, 'PROFILE_NOT_FOUND', 'Profile not found')
  }

  return NextResponse.json({
    user_id: data.user_id,
    email: auth.user.email ?? '',
    full_name: data.full_name ?? null,
    avatar_url: data.avatar_url ?? null,
    is_admin: isAdminEmail(auth.user.email),
    created_at: data.created_at,
    updated_at: data.updated_at,
  })
}
