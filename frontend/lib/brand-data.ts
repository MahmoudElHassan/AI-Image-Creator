import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSupabasePublicEnv } from '@/lib/supabase/env'
import type { Brand, BrandKit, BrandListItem, KitAnswers, KitStatus } from '@/types'

export type BrandRow = {
  id: string
  name: string
  logo_path: string | null
  created_at: string
  updated_at: string
}

export type KitRow = {
  brand_id: string
  tagline: string | null
  tone: KitAnswers['tone']
  audience: string | null
  colors: string[] | null
  avoid_words: string | null
  summary: string | null
  status: KitStatus
  completed_at: string | null
  updated_at: string | null
}

export function buildLogoUrl(
  logoPath: string | null,
  updatedAt?: string | null,
): string | null {
  if (!logoPath) return null
  const env = getSupabasePublicEnv()
  if (!env) return null
  const bucket = process.env.STORAGE_BUCKET?.trim() || 'brand-assets'
  const url = `${env.url}/storage/v1/object/public/${bucket}/${logoPath}`
  return updatedAt ? `${url}?v=${encodeURIComponent(updatedAt)}` : url
}

export function toBrand(row: BrandRow, kitStatus: KitStatus): Brand {
  return {
    id: row.id,
    name: row.name,
    logo_url: buildLogoUrl(row.logo_path, row.updated_at),
    kit_status: kitStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function toBrandListItem(row: BrandRow, kitStatus: KitStatus): BrandListItem {
  return {
    id: row.id,
    name: row.name,
    logo_url: buildLogoUrl(row.logo_path, row.updated_at),
    kit_status: kitStatus,
    created_at: row.created_at,
  }
}

export function emptyAnswers(): KitAnswers {
  return {
    tagline: null,
    tone: null,
    audience: null,
    colors: [],
    avoid_words: null,
  }
}

export function deriveKitStatus(answers: KitAnswers): KitStatus {
  const { tagline, tone, audience, colors, avoid_words } = answers
  if (tone != null && audience != null && colors.length >= 1) return 'complete'
  if (
    tagline == null &&
    tone == null &&
    audience == null &&
    colors.length === 0 &&
    avoid_words == null
  ) {
    return 'not_started'
  }
  return 'in_progress'
}

export function deriveKitSummary(brandName: string, answers: KitAnswers): string | null {
  const { tagline, tone, audience, colors, avoid_words } = answers
  if (
    tagline == null &&
    tone == null &&
    audience == null &&
    colors.length === 0 &&
    avoid_words == null
  ) {
    return null
  }
  return [
    `Brand: ${brandName}`,
    `Tagline: ${tagline || 'None specified'}`,
    `Tone: ${tone || 'None specified'}`,
    `Audience: ${audience || 'None specified'}`,
    `Colors: ${colors.length ? colors.join(', ') : 'None specified'}`,
    `Avoid: ${avoid_words || 'None specified'}`,
  ].join('\n')
}

export function kitToResponse(brand: BrandRow, row: KitRow | null): BrandKit {
  if (!row) {
    return {
      brand_id: brand.id,
      brand_name: brand.name,
      answers: emptyAnswers(),
      summary: null,
      status: 'not_started',
      completed_at: null,
      updated_at: null,
    }
  }
  return {
    brand_id: brand.id,
    brand_name: brand.name,
    answers: {
      tagline: row.tagline,
      tone: row.tone,
      audience: row.audience,
      colors: row.colors ?? [],
      avoid_words: row.avoid_words,
    },
    summary: row.summary,
    status: row.status,
    completed_at: row.completed_at,
    updated_at: row.updated_at,
  }
}

export function validateBrandName(raw: unknown): string | { error: string } {
  if (typeof raw !== 'string') {
    return { error: 'Brand name must be between 2 and 120 characters' }
  }
  const name = raw.trim()
  if (name.length < 2 || name.length > 120) {
    return { error: 'Brand name must be between 2 and 120 characters' }
  }
  return name
}

export async function loadKitStatuses(
  supabase: SupabaseClient,
  brandIds: string[],
): Promise<Record<string, KitStatus>> {
  if (brandIds.length === 0) return {}
  const { data } = await supabase
    .from('brand_kits')
    .select('brand_id, status')
    .in('brand_id', brandIds)
  const statuses: Record<string, KitStatus> = {}
  for (const row of data ?? []) {
    statuses[row.brand_id] = row.status as KitStatus
  }
  return statuses
}

export async function loadOwnedBrandRow(
  supabase: SupabaseClient,
  brandId: string,
  userId: string,
): Promise<BrandRow | null> {
  const { data } = await supabase
    .from('brands')
    .select('id, name, logo_path, created_at, updated_at')
    .eq('id', brandId)
    .eq('owner_user_id', userId)
    .maybeSingle()
  return data
}

export async function loadOwnedBrandFromSession(
  brandId: string,
): Promise<{ brand: Brand; userId: string } | { reason: 'unauthenticated' | 'not_found' }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { reason: 'unauthenticated' }

  const row = await loadOwnedBrandRow(supabase, brandId, user.id)
  if (!row) return { reason: 'not_found' }

  const statuses = await loadKitStatuses(supabase, [brandId])
  return {
    brand: toBrand(row, statuses[brandId] ?? 'not_started'),
    userId: user.id,
  }
}

export function isDuplicateBrandError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  return text.includes('23505') || text.includes('uq_brands_owner_name_ci') || text.includes('duplicate')
}
