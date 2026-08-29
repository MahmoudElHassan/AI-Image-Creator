import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthedSupabase,
  jsonError,
  proxyToBackend,
  shouldUseNativeApi,
} from '@/lib/api-route'
import {
  deriveKitStatus,
  deriveKitSummary,
  emptyAnswers,
  kitToResponse,
  loadOwnedBrandRow,
  type KitRow,
} from '@/lib/brand-data'
import type { KitAnswers, ToneOption } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: { brandId: string } }

const TONES = new Set<ToneOption>([
  'formal',
  'casual',
  'playful',
  'professional',
  'friendly',
])

function parseAnswers(raw: unknown): KitAnswers | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const tagline = value.tagline == null ? null : String(value.tagline)
  const tone =
    value.tone == null
      ? null
      : TONES.has(value.tone as ToneOption)
        ? (value.tone as ToneOption)
        : null
  if (value.tone != null && tone == null) return null
  const audience = value.audience == null ? null : String(value.audience)
  const colors = Array.isArray(value.colors)
    ? value.colors.filter((item): item is string => typeof item === 'string')
    : []
  const avoid_words = value.avoid_words == null ? null : String(value.avoid_words)
  return { tagline, tone, audience, colors, avoid_words }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!shouldUseNativeApi()) {
    return proxyToBackend(request, `/brands/${params.brandId}/kit`)
  }

  const auth = await getAuthedSupabase(request)
  if ('response' in auth) return auth.response

  const brand = await loadOwnedBrandRow(auth.supabase, params.brandId, auth.user.id)
  if (!brand) return jsonError(404, 'BRAND_NOT_FOUND', 'Brand not found')

  const { data } = await auth.supabase
    .from('brand_kits')
    .select('*')
    .eq('brand_id', params.brandId)
    .maybeSingle()

  return NextResponse.json(kitToResponse(brand, (data as KitRow | null) ?? null))
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  if (!shouldUseNativeApi()) {
    return proxyToBackend(request, `/brands/${params.brandId}/kit`)
  }

  const auth = await getAuthedSupabase(request)
  if ('response' in auth) return auth.response

  const brand = await loadOwnedBrandRow(auth.supabase, params.brandId, auth.user.id)
  if (!brand) return jsonError(404, 'BRAND_NOT_FOUND', 'Brand not found')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid request payload')
  }

  const answers = parseAnswers(
    body && typeof body === 'object' && 'answers' in body
      ? (body as { answers: unknown }).answers
      : emptyAnswers(),
  )
  if (!answers) {
    return jsonError(400, 'VALIDATION_ERROR', 'Invalid kit answers')
  }

  const { data: existing } = await auth.supabase
    .from('brand_kits')
    .select('status, completed_at')
    .eq('brand_id', params.brandId)
    .maybeSingle()

  const status = deriveKitStatus(answers)
  const summary = deriveKitSummary(brand.name, answers)
  const now = new Date().toISOString()
  const completed_at =
    status === 'complete'
      ? existing?.status === 'complete' && existing.completed_at
        ? existing.completed_at
        : now
      : null

  const { data, error } = await auth.supabase
    .from('brand_kits')
    .upsert(
      {
        brand_id: params.brandId,
        tagline: answers.tagline,
        tone: answers.tone,
        audience: answers.audience,
        colors: answers.colors,
        avoid_words: answers.avoid_words,
        summary,
        status,
        completed_at,
      },
      { onConflict: 'brand_id' },
    )
    .select('*')
    .single()

  if (error || !data) {
    return jsonError(400, 'VALIDATION_ERROR', error?.message ?? 'Failed to save kit')
  }

  return NextResponse.json(kitToResponse(brand, data as KitRow))
}
