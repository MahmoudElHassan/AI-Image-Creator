import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { backendUrl } from '@/lib/server-api-url'
import { GeneratorForm } from '@/components/generation/generator-form'
import type { Brand } from '@/types'

async function loadBrand(brandId: string): Promise<Brand> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) redirect('/login')

  const apiUrl = backendUrl(`/brands/${brandId}`)
  const response = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  })
  if (response.status === 404) notFound()
  if (response.status === 401) redirect('/login')
  if (!response.ok) throw new Error('Failed to load brand')

  const payload: unknown = await response.json()
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as Record<string, unknown>).name !== 'string' ||
    !('logo_url' in (payload as Record<string, unknown>))
  ) {
    throw new Error('Invalid brand payload')
  }
  return payload as Brand
}

export default async function BrandGeneratorPage({
  params,
}: {
  params: { brandId: string }
}) {
  const { brandId } = params
  const brand = await loadBrand(brandId)
  return (
    <GeneratorForm
      brandId={brandId}
      brandName={brand.name}
      brandHasLogo={Boolean(brand.logo_url)}
    />
  )
}